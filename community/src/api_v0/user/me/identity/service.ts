import type { Context } from 'hono';
import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import {
  account,
  communityIdentities,
  communityMemberships,
} from '../../../../../../share/drizzle/schema';
import type { AppContext } from '../../../../core/types';
import { getAuth } from '../../../../auth/better-auth';
import { CommunityProviderError } from '../../../../lib/community/error';
import { getCurrentDiscordUser } from '../../../../lib/community/discord/oauth';
import type {
  CommunityAccountProfile,
  CommunityMembership,
} from '../../../../lib/community/type';
import {
  verifyDiscordIdentityRoute,
  type VerifiedDiscordIdentity,
} from './schema';

type LinkedDiscordAccount = {
  id: string;
  accountId: string;
};

type PersistVerificationInput = {
  appUserId: string;
  linkedAccount: LinkedDiscordAccount;
  oauthUser: CommunityAccountProfile;
  guildId: string;
  guildMembership: CommunityMembership | null;
  verifiedAt: string;
};

type IdentityAuthApi = {
  getSession(input: { headers: Headers }): Promise<{ user: { id: string } } | null>;
  getAccessToken(input: {
    body: { providerId: string; accountId: string };
    headers: Headers;
  }): Promise<{ accessToken: string }>;
};

type VerificationDependencies = {
  getAuthApi(c: Context<AppContext>): IdentityAuthApi;
  getCurrentDiscordUser(accessToken: string): Promise<CommunityAccountProfile>;
  findLinkedDiscordAccounts(
    c: Context<AppContext>,
    userId: string,
  ): Promise<LinkedDiscordAccount[]>;
  persistVerification(
    c: Context<AppContext>,
    input: PersistVerificationInput,
  ): Promise<VerifiedDiscordIdentity | null>;
  now(): string;
};

const findLinkedDiscordAccounts: VerificationDependencies['findLinkedDiscordAccounts'] = async (
  c,
  userId,
) => c.get('db').transaction((tx) => tx
  .select({
    id: account.id,
    accountId: account.accountId,
  })
  .from(account)
  .where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
  .limit(2));

const persistVerification: VerificationDependencies['persistVerification'] = async (c, input) => {
  const db = c.get('db');
  const membershipStatus = input.guildMembership ? 'member' : 'not_member';

  return db.transaction(async (tx) => {
    const [identity] = await tx
      .insert(communityIdentities)
      .values({
        userId: input.appUserId,
        authAccountId: input.linkedAccount.id,
        provider: 'discord',
        providerAccountId: input.oauthUser.id,
        username: input.oauthUser.username,
        providerDisplayName: input.oauthUser.displayName,
        avatarUrl: input.oauthUser.avatarUrl,
        oauthVerifiedAt: input.verifiedAt,
        lastSyncedAt: input.verifiedAt,
        updatedAt: input.verifiedAt,
      })
      .onConflictDoUpdate({
        target: [communityIdentities.userId, communityIdentities.provider],
        set: {
          authAccountId: input.linkedAccount.id,
          providerAccountId: input.oauthUser.id,
          username: input.oauthUser.username,
          providerDisplayName: input.oauthUser.displayName,
          avatarUrl: input.oauthUser.avatarUrl,
          oauthVerifiedAt: input.verifiedAt,
          lastSyncedAt: input.verifiedAt,
          updatedAt: input.verifiedAt,
        },
      })
      .returning();

    if (!identity) {
      throw new Error('Discord identity upsert did not return a row');
    }

    const roleIds = input.guildMembership?.roles.map((role) => role.id) ?? [];
    const roleNames = input.guildMembership?.roles.map((role) => role.name) ?? [];
    const nickname = input.guildMembership?.nickname ?? null;
    const membershipVerifiedAt = input.guildMembership ? input.verifiedAt : null;

    await tx
      .insert(communityMemberships)
      .values({
        identityId: identity.identityId,
        communityId: input.guildId,
        membershipStatus,
        nickname,
        roleIds,
        roleNames,
        verifiedAt: membershipVerifiedAt,
        lastCheckedAt: input.verifiedAt,
        updatedAt: input.verifiedAt,
      })
      .onConflictDoUpdate({
        target: [communityMemberships.identityId, communityMemberships.communityId],
        set: {
          membershipStatus,
          nickname,
          roleIds,
          roleNames,
          verifiedAt: membershipVerifiedAt,
          lastCheckedAt: input.verifiedAt,
          updatedAt: input.verifiedAt,
        },
      });

    if (!input.guildMembership) {
      return null;
    }

    return {
      identityId: identity.identityId,
      provider: 'discord',
      providerAccountId: identity.providerAccountId,
      username: identity.username,
      providerDisplayName: identity.providerDisplayName,
      avatarUrl: identity.avatarUrl,
      oauthVerifiedAt: identity.oauthVerifiedAt,
      membership: {
        communityId: input.guildId,
        membershipStatus: 'member',
        nickname,
        roleIds,
        roleNames,
        verifiedAt: input.verifiedAt,
      },
    };
  });
};

const defaultDependencies: VerificationDependencies = {
  getAuthApi: (c) => getAuth(c).api,
  getCurrentDiscordUser,
  findLinkedDiscordAccounts,
  persistVerification,
  now: () => new Date().toISOString(),
};

const errorBody = (code: string, message: string) => ({ code, message });

const isUniqueViolation = (error: unknown): boolean => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === '23505'
);

const isDiscordUnknownMember = (error: unknown): error is CommunityProviderError => {
  if (!(error instanceof CommunityProviderError) || error.status !== 404) {
    return false;
  }

  return typeof error.details === 'object'
    && error.details !== null
    && 'code' in error.details
    && error.details.code === 10007;
};

export const createVerifyDiscordIdentityService = (
  dependencyOverrides: Partial<VerificationDependencies> = {},
): RouteHandler<typeof verifyDiscordIdentityRoute, AppContext> => {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };

  return async (c) => {
    const appUser = c.get('appUser');
    const headers = c.req.raw.headers;
    const authApi = dependencies.getAuthApi(c);
    const authSession = await authApi.getSession({ headers });

    if (!authSession || authSession.user.id !== appUser.id) {
      return c.json(errorBody(
        'AUTH_SESSION_MISMATCH',
        'The Better Auth session does not match the signed-in application user.',
      ), 401);
    }

    const linkedAccounts = await dependencies.findLinkedDiscordAccounts(c, appUser.id);
    if (linkedAccounts.length === 0) {
      return c.json(errorBody(
        'DISCORD_ACCOUNT_NOT_LINKED',
        'Link a Discord account before verifying guild membership.',
      ), 409);
    }
    if (linkedAccounts.length > 1) {
      return c.json(errorBody(
        'MULTIPLE_DISCORD_ACCOUNTS',
        'More than one Discord account is linked; remove the unintended account first.',
      ), 409);
    }

    const [linkedAccount] = linkedAccounts;
    let accessToken: string;
    let oauthUser: CommunityAccountProfile;

    try {
      ({ accessToken } = await authApi.getAccessToken({
        body: {
          providerId: 'discord',
          accountId: linkedAccount.accountId,
        },
        headers,
      }));
      oauthUser = await dependencies.getCurrentDiscordUser(accessToken);
    } catch (error) {
      if (error instanceof CommunityProviderError) {
        if (error.status !== 401 && error.status !== 403) {
          console.error('[Discord Identity] OAuth provider unavailable', { status: error.status });
          return c.json(errorBody(
            'DISCORD_SERVICE_UNAVAILABLE',
            'Discord could not verify the linked account.',
          ), 502);
        }
      }

      console.warn('[Discord Identity] Linked account requires reauthentication');
      return c.json(errorBody(
        'DISCORD_REAUTHENTICATION_REQUIRED',
        'Reconnect Discord and try again.',
      ), 401);
    }

    if (oauthUser.id !== linkedAccount.accountId) {
      console.error('[Discord Identity] OAuth subject did not match the linked account');
      return c.json(errorBody(
        'DISCORD_ACCOUNT_MISMATCH',
        'The Discord OAuth identity does not match the linked account.',
      ), 409);
    }

    const verifiedAt = dependencies.now();

    try {
      const guildMembership = await c.get('community').getGuildMembership(oauthUser.id);
      if (guildMembership.userId !== oauthUser.id) {
        throw new CommunityProviderError(
          'Discord guild membership did not match the OAuth user',
          502,
          'discord',
        );
      }

      const result = await dependencies.persistVerification(c, {
        appUserId: appUser.id,
        linkedAccount,
        oauthUser,
        guildId: c.env.DISCORD_GUILD_ID,
        guildMembership,
        verifiedAt,
      });

      if (!result) {
        throw new Error('Verified Discord membership was not persisted');
      }

      return c.json(result, 200);
    } catch (error) {
      if (isDiscordUnknownMember(error)) {
        try {
          await dependencies.persistVerification(c, {
            appUserId: appUser.id,
            linkedAccount,
            oauthUser,
            guildId: c.env.DISCORD_GUILD_ID,
            guildMembership: null,
            verifiedAt,
          });
        } catch (persistError) {
          if (isUniqueViolation(persistError)) {
            return c.json(errorBody(
              'DISCORD_IDENTITY_CONFLICT',
              'This Discord account is already linked to another user.',
            ), 409);
          }
          throw persistError;
        }

        return c.json(errorBody(
          'DISCORD_GUILD_MEMBERSHIP_REQUIRED',
          'Join the configured Discord guild before continuing.',
        ), 412);
      }

      if (isUniqueViolation(error)) {
        return c.json(errorBody(
          'DISCORD_IDENTITY_CONFLICT',
          'This Discord account is already linked to another user.',
        ), 409);
      }

      if (error instanceof CommunityProviderError) {
        console.error('[Discord Identity] Guild verification failed', { status: error.status });
        return c.json(errorBody(
          'DISCORD_SERVICE_UNAVAILABLE',
          'Discord could not verify guild membership.',
        ), 502);
      }

      throw error;
    }
  };
};

export const verifyDiscordIdentityService = createVerifyDiscordIdentityService();
