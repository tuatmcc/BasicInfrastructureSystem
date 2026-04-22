import type { DbCategory, DbChannel, DbRole, DbUser, Snowflake } from "../types";

export interface IDiscordDatabaseController {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getUsers(memberId?: string | null): Promise<DbUser[]>;
  getUser(discordUserId: Snowflake): Promise<DbUser | null>;
  createUser(discordUserId: Snowflake, displayName: string, memberId?: string | null): Promise<DbUser>;
  updateUser(discordUserId: Snowflake, displayName: string, memberId?: string | null): Promise<DbUser | null>;
  deleteUser(discordUserId: Snowflake): Promise<boolean>;
  syncUserRoles(discordUserId: Snowflake, roleIds: Snowflake[]): Promise<number>;
  getRoles(): Promise<DbRole[]>;
  getRole(roleId: Snowflake): Promise<DbRole | null>;
  createRole(roleId: Snowflake, roleName: string, permissions: number): Promise<DbRole>;
  updateRole(roleId: Snowflake, roleName?: string | null, permissions?: number | null): Promise<DbRole | null>;
  deleteRole(roleId: Snowflake): Promise<boolean>;
  getCategories(): Promise<DbCategory[]>;
  getCategory(categoryId: Snowflake): Promise<DbCategory | null>;
  createCategory(categoryId: Snowflake, categoryName: string): Promise<DbCategory>;
  deleteCategory(categoryId: Snowflake): Promise<boolean>;
  syncCategoryPermissions(categoryId: Snowflake, roleIds: Snowflake[]): Promise<number>;
  getChannels(): Promise<DbChannel[]>;
  getChannel(channelId: Snowflake): Promise<DbChannel | null>;
  createChannel(channelId: Snowflake, channelName: string, categoryId: Snowflake, allowedRoleIds?: Snowflake[] | null): Promise<DbChannel>;
  deleteChannel(channelId: Snowflake): Promise<boolean>;
  syncChannelPermissions(channelId: Snowflake, roleIds: Snowflake[]): Promise<number>;
}
