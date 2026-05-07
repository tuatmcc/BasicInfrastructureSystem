import { Role, RoleSchema, CreateRoleInput } from '../type';
import type { DiscordProvider } from './main';

export async function createRoleAPI(provider: DiscordProvider, input: CreateRoleInput): Promise<Role> {
  const data = await provider.request<any>('POST', `/guilds/${provider.guildId}/roles`, {
    name: input.name,
    color: input.color ? rgbToInteger(input.color) : undefined,
    permissions: input.permissions,
    hoist: true,
    mentionable: true,
  });

  return roleFromDiscord(data);
}

export async function deleteRoleAPI(provider: DiscordProvider, roleId: string): Promise<void> {
  await provider.request('DELETE', `/guilds/${provider.guildId}/roles/${roleId}`);
}

export async function listRolesAPI(provider: DiscordProvider): Promise<Role[]> {
  const roles = await provider.request<any[]>('GET', `/guilds/${provider.guildId}/roles`);
  return roles.map(roleFromDiscord);
}

// common
function rgbToInteger(rgb: number[]): number {
  return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}

function integerToRgb(int: number): number[] {
  return [(int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF];
}

function roleFromDiscord(data: any): Role {
  return RoleSchema.parse({
    id: data.id,
    name: data.name,
    color: integerToRgb(data.color),
    position: data.position,
    permissions: data.permissions,
  });
}
