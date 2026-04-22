import { DatabaseError } from "../errors";
import type { DbCategory, DbChannel, DbRole, DbUser, Snowflake } from "../types";
import type { IDiscordDatabaseController } from "./interface";

export class MemoryDiscordDatabaseController implements IDiscordDatabaseController {
  private users = new Map<Snowflake, DbUser>();
  private roles = new Map<Snowflake, DbRole>();
  private categories = new Map<Snowflake, DbCategory>();
  private channels = new Map<Snowflake, DbChannel>();

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async getUsers(memberId: string | null = null): Promise<DbUser[]> {
    return [...this.users.values()].filter((user) => memberId === null || user.memberId === memberId);
  }

  async getUser(discordUserId: Snowflake): Promise<DbUser | null> {
    return this.users.get(discordUserId) ?? null;
  }

  async createUser(discordUserId: Snowflake, displayName: string, memberId: string | null = null): Promise<DbUser> {
    if (this.users.has(discordUserId)) {
      throw new DatabaseError(`User ${discordUserId} already exists`);
    }
    const user = { discordUserId, displayName, memberId, roleIds: [] };
    this.users.set(discordUserId, user);
    return user;
  }

  async updateUser(discordUserId: Snowflake, displayName: string, memberId: string | null = null): Promise<DbUser | null> {
    const user = this.users.get(discordUserId);
    if (user === undefined) {
      return null;
    }
    const updated = { ...user, displayName, memberId };
    this.users.set(discordUserId, updated);
    return updated;
  }

  async deleteUser(discordUserId: Snowflake): Promise<boolean> {
    return this.users.delete(discordUserId);
  }

  async syncUserRoles(discordUserId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    const user = this.users.get(discordUserId);
    if (user === undefined) {
      throw new DatabaseError(`User ${discordUserId} not found`);
    }
    const existing = roleIds.filter((roleId) => this.roles.has(roleId));
    this.users.set(discordUserId, { ...user, roleIds: existing });
    return existing.length;
  }

  async getRoles(): Promise<DbRole[]> {
    return [...this.roles.values()];
  }

  async getRole(roleId: Snowflake): Promise<DbRole | null> {
    return this.roles.get(roleId) ?? null;
  }

  async createRole(roleId: Snowflake, roleName: string, permissions: number): Promise<DbRole> {
    const role = { roleId, roleName, permissions };
    this.roles.set(roleId, role);
    return role;
  }

  async updateRole(roleId: Snowflake, roleName: string | null = null, permissions: number | null = null): Promise<DbRole | null> {
    const role = this.roles.get(roleId);
    if (role === undefined) {
      return null;
    }
    const updated = { roleId, roleName: roleName ?? role.roleName, permissions: permissions ?? 0 };
    this.roles.set(roleId, updated);
    return updated;
  }

  async deleteRole(roleId: Snowflake): Promise<boolean> {
    for (const user of this.users.values()) {
      user.roleIds = user.roleIds.filter((id) => id !== roleId);
    }
    for (const category of this.categories.values()) {
      category.roleIds = category.roleIds.filter((id) => id !== roleId);
    }
    for (const channel of this.channels.values()) {
      channel.roleIds = channel.roleIds.filter((id) => id !== roleId);
    }
    return this.roles.delete(roleId);
  }

  async getCategories(): Promise<DbCategory[]> {
    return [...this.categories.values()].map((category) => this.withCategoryChannels(category));
  }

  async getCategory(categoryId: Snowflake): Promise<DbCategory | null> {
    const category = this.categories.get(categoryId);
    return category === undefined ? null : this.withCategoryChannels(category);
  }

  async createCategory(categoryId: Snowflake, categoryName: string): Promise<DbCategory> {
    const category = { categoryId, categoryName, channels: [], roleIds: [] };
    this.categories.set(categoryId, category);
    return category;
  }

  async deleteCategory(categoryId: Snowflake): Promise<boolean> {
    for (const channel of [...this.channels.values()]) {
      if (channel.categoryId === categoryId) {
        this.channels.delete(channel.channelId);
      }
    }
    return this.categories.delete(categoryId);
  }

  async syncCategoryPermissions(categoryId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    const category = this.categories.get(categoryId);
    if (category === undefined) {
      throw new DatabaseError(`Category ${categoryId} not found`);
    }
    const existing = roleIds.filter((roleId) => this.roles.has(roleId));
    this.categories.set(categoryId, { ...category, roleIds: existing });
    return existing.length;
  }

  async getChannels(): Promise<DbChannel[]> {
    return [...this.channels.values()];
  }

  async getChannel(channelId: Snowflake): Promise<DbChannel | null> {
    return this.channels.get(channelId) ?? null;
  }

  async createChannel(channelId: Snowflake, channelName: string, categoryId: Snowflake, allowedRoleIds: Snowflake[] | null = null): Promise<DbChannel> {
    if (!this.categories.has(categoryId)) {
      throw new DatabaseError(`Category ${categoryId} not found`);
    }
    const channel = {
      channelId,
      channelName,
      categoryId,
      roleIds: (allowedRoleIds ?? []).filter((roleId) => this.roles.has(roleId)),
    };
    this.channels.set(channelId, channel);
    return channel;
  }

  async deleteChannel(channelId: Snowflake): Promise<boolean> {
    return this.channels.delete(channelId);
  }

  async syncChannelPermissions(channelId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    const channel = this.channels.get(channelId);
    if (channel === undefined) {
      throw new DatabaseError(`Channel ${channelId} not found`);
    }
    const existing = roleIds.filter((roleId) => this.roles.has(roleId));
    this.channels.set(channelId, { ...channel, roleIds: existing });
    return existing.length;
  }

  private withCategoryChannels(category: DbCategory): DbCategory {
    return {
      ...category,
      channels: [...this.channels.values()].filter((channel) => channel.categoryId === category.categoryId),
    };
  }
}
