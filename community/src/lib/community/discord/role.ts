import type { DiscordProvider } from './main';
import { Role, RoleSchema } from '../type';

export async function listUserRolesAPI(provider: DiscordProvider, userId: string): Promise<Role[]> {
  const member = await provider.request<any>('GET', `/guilds/${provider.guildId}/members/${userId}`);
  const userRoleIds: string[] = member.roles;
  const allRoles = await provider.request<any[]>('GET', `/guilds/${provider.guildId}/roles`);

  return allRoles
    .filter((role) => userRoleIds.includes(role.id))
    .map((role) =>
      RoleSchema.parse({
        id: role.id,
        name: role.name,
      })
    );
}
