import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityProviderError } from '../../../../lib/community/error';
import { createVerifyDiscordIdentityService } from './service';

const fixedNow = '2026-07-16T04:00:00.000Z';
const appUser = {
  id: 'user-1',
  name: 'Test User',
  memberId: null,
  role: 'user' as const,
};
const linkedAccount = {
  id: 'account-row-1',
  accountId: '123456789012345678',
};
const oauthUser = {
  id: linkedAccount.accountId,
  username: 'test-user',
  globalName: 'Test User',
  avatarUrl: null,
};
const guildMembership = {
  userId: linkedAccount.accountId,
  nickname: '部員名',
  roles: [{ id: '323456789012345678', name: '部員' }],
};
const persisted = {
  identityId: '11111111-1111-4111-8111-111111111111',
  provider: 'discord' as const,
  providerAccountId: linkedAccount.accountId,
  username: oauthUser.username,
  providerDisplayName: oauthUser.globalName,
  avatarUrl: null,
  oauthVerifiedAt: fixedNow,
  membership: {
    communityId: '223456789012345678',
    membershipStatus: 'member' as const,
    nickname: guildMembership.nickname,
    roleIds: ['323456789012345678'],
    roleNames: ['部員'],
    verifiedAt: fixedNow,
  },
};

type JsonResponse = { body: unknown; status: number };
const asJsonResponse = (response: unknown): JsonResponse => response as JsonResponse;

const createContext = (community: {
  getGuildMembership(userId: string): Promise<typeof guildMembership>;
}) => ({
  env: { DISCORD_GUILD_ID: '223456789012345678' },
  req: { raw: new Request('https://api.example.com/api/v0/user/me/identities/discord/verify') },
  get: (key: string) => {
    if (key === 'appUser') return appUser;
    if (key === 'community') return community;
    throw new Error(`Unexpected context key: ${key}`);
  },
  json: (body: unknown, status: number): JsonResponse => ({ body, status }),
});

const baseDependencies = {
  getAuthApi: () => ({
    getSession: async () => ({ user: { id: appUser.id } }),
    getAccessToken: async () => ({ accessToken: 'oauth-token' }),
  }),
  getCurrentDiscordUser: async () => oauthUser,
  findLinkedDiscordAccounts: async () => [linkedAccount],
  persistVerification: async () => persisted,
  now: () => fixedNow,
};

test('Discord identity verification requires matching application and Better Auth sessions', async () => {
  let providerCalled = false;
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    getAuthApi: () => ({
      getSession: async () => ({ user: { id: 'another-user' } }),
      getAccessToken: async () => ({ accessToken: 'oauth-token' }),
    }),
  });
  const response = await service(createContext({
    getGuildMembership: async () => {
      providerCalled = true;
      return guildMembership;
    },
  }) as never, async () => {});

  assert.equal(asJsonResponse(response).status, 401);
  assert.equal(providerCalled, false);
});

test('Discord identity verification correlates OAuth and guild identities before persisting', async () => {
  const persistedInputs: unknown[] = [];
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    persistVerification: async (_c, input) => {
      persistedInputs.push(input);
      return persisted;
    },
  });
  const response = await service(createContext({
    getGuildMembership: async (userId) => {
      assert.equal(userId, linkedAccount.accountId);
      return guildMembership;
    },
  }) as never, async () => {});

  assert.deepEqual(response, { body: persisted, status: 200 });
  assert.deepEqual(persistedInputs, [{
    appUserId: appUser.id,
    linkedAccount,
    oauthUser,
    guildId: '223456789012345678',
    guildMembership,
    verifiedAt: fixedNow,
  }]);
});

test('Discord identity verification requires an explicitly linked Discord account', async () => {
  let oauthCalled = false;
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    findLinkedDiscordAccounts: async () => [],
    getCurrentDiscordUser: async () => {
      oauthCalled = true;
      return oauthUser;
    },
  });
  const response = await service(createContext({
    getGuildMembership: async () => guildMembership,
  }) as never, async () => {});

  const jsonResponse = asJsonResponse(response);
  assert.equal(jsonResponse.status, 409);
  assert.deepEqual(jsonResponse.body, {
    code: 'DISCORD_ACCOUNT_NOT_LINKED',
    message: 'Link a Discord account before verifying guild membership.',
  });
  assert.equal(oauthCalled, false);
});

test('Discord identity verification rejects an OAuth subject that differs from the linked account', async () => {
  let guildCalled = false;
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    getCurrentDiscordUser: async () => ({
      ...oauthUser,
      id: '999456789012345678',
    }),
  });
  const response = await service(createContext({
    getGuildMembership: async () => {
      guildCalled = true;
      return guildMembership;
    },
  }) as never, async () => {});

  assert.equal(asJsonResponse(response).status, 409);
  assert.equal(guildCalled, false);
});

test('Discord identity verification stores non-membership evidence and returns 412', async () => {
  const persistedInputs: Array<{ guildMembership: unknown }> = [];
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    persistVerification: async (_c, input) => {
      persistedInputs.push(input);
      return null;
    },
  });
  const response = await service(createContext({
    getGuildMembership: async () => {
      throw new CommunityProviderError('Unknown Member', 404, 'discord', { code: 10007 });
    },
  }) as never, async () => {});

  assert.equal(asJsonResponse(response).status, 412);
  assert.equal(persistedInputs.length, 1);
  assert.equal(persistedInputs[0].guildMembership, null);
});

test('Discord identity verification maps Discord outages to 502 without persisting', async () => {
  let persistedCalled = false;
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    persistVerification: async () => {
      persistedCalled = true;
      return persisted;
    },
  });
  const response = await service(createContext({
    getGuildMembership: async () => {
      throw new CommunityProviderError('Discord unavailable', 503, 'discord');
    },
  }) as never, async () => {});

  assert.equal(asJsonResponse(response).status, 502);
  assert.equal(persistedCalled, false);
});

test('Discord identity verification does not mistake an unknown guild for an absent member', async () => {
  const service = createVerifyDiscordIdentityService(baseDependencies);
  const response = await service(createContext({
    getGuildMembership: async () => {
      throw new CommunityProviderError('Unknown Guild', 404, 'discord', { code: 10004 });
    },
  }) as never, async () => {});

  assert.equal(asJsonResponse(response).status, 502);
});

test('Discord identity verification treats OAuth rate limits as a provider outage', async () => {
  const service = createVerifyDiscordIdentityService({
    ...baseDependencies,
    getCurrentDiscordUser: async () => {
      throw new CommunityProviderError('Rate limited', 429, 'discord');
    },
  });
  const response = await service(createContext({
    getGuildMembership: async () => guildMembership,
  }) as never, async () => {});

  const jsonResponse = asJsonResponse(response);
  assert.equal(jsonResponse.status, 502);
  assert.deepEqual(jsonResponse.body, {
    code: 'DISCORD_SERVICE_UNAVAILABLE',
    message: 'Discord could not verify the linked account.',
  });
});
