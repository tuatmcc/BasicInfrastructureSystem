import type { DiscordProvider } from './main';
import type { CommunityMembership, CommunityRole } from '../type';
import {
  DiscordMembershipSchema,
  DiscordRoleSchema,
  DiscordSnowflakeSchema,
} from './schema';
import { CommunityProviderError } from '../error';

type DiscordGuildMemberResponse = {
  user?: { id?: unknown };
  nick?: unknown;
  roles?: unknown;
};

type DiscordRoleResponse = {
  id?: unknown;
  name?: unknown;
};

export async function getGuildMembershipAPI(
  provider: DiscordProvider,
  userId: string,
): Promise<CommunityMembership> {
  const expectedUserId = DiscordSnowflakeSchema.parse(userId);
  const member = await provider.request<DiscordGuildMemberResponse>(
    'GET',
    `/guilds/${provider.guildId}/members/${expectedUserId}`,
  );
  const returnedUserId = DiscordSnowflakeSchema.safeParse(member.user?.id);

  if (!returnedUserId.success || returnedUserId.data !== expectedUserId) {
    throw new CommunityProviderError(
      'Discord guild member identity did not match the requested user',
      502,
      'discord',
    );
  }

  const memberRoleIds = DiscordSnowflakeSchema.array().parse(member.roles);
  const allRoles = await provider.request<DiscordRoleResponse[]>(
    'GET',
    `/guilds/${provider.guildId}/roles`,
  );
  const roleMap = new Map(
    allRoles.map((role) => {
      const parsed = DiscordRoleSchema.parse(role);
      return [parsed.id, parsed] as const;
    }),
  );

  return DiscordMembershipSchema.parse({
    userId: expectedUserId,
    nickname: member.nick ?? null,
    roles: memberRoleIds.flatMap((roleId) => {
      const role = roleMap.get(roleId);
      return role ? [role] : [];
    }),
  });
}

export async function listUserRolesAPI(provider: DiscordProvider, userId: string): Promise<CommunityRole[]> {
  return (await getGuildMembershipAPI(provider, userId)).roles;
}
