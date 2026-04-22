import type { IDiscordController } from "../DiscordController";
import type { DbCategory, DbChannel, DbRole, DbUser, Snowflake } from "../types";
import type { IDiscordDatabaseController } from "./interface";

type MutationResult = boolean | number | DbUser | DbRole | DbCategory | DbChannel | null;

export class DiscordLoggingDatabaseController implements IDiscordDatabaseController {
  constructor(
    private readonly controller: IDiscordDatabaseController,
    private readonly discordController: IDiscordController,
    private readonly logChannelId: Snowflake,
  ) {}

  async connect(): Promise<void> {
    await this.controller.connect();
  }

  async disconnect(): Promise<void> {
    await this.controller.disconnect();
  }

  getUsers(memberId?: string | null): Promise<DbUser[]> {
    return this.controller.getUsers(memberId);
  }

  getUser(discordUserId: Snowflake): Promise<DbUser | null> {
    return this.controller.getUser(discordUserId);
  }

  createUser(discordUserId: Snowflake, displayName: string, memberId: string | null = null): Promise<DbUser> {
    return this.execute("create_user", `discord_user_id=${discordUserId}`, () => this.controller.createUser(discordUserId, displayName, memberId));
  }

  updateUser(discordUserId: Snowflake, displayName: string, memberId: string | null = null): Promise<DbUser | null> {
    return this.execute("update_user", `discord_user_id=${discordUserId}`, () => this.controller.updateUser(discordUserId, displayName, memberId));
  }

  deleteUser(discordUserId: Snowflake): Promise<boolean> {
    return this.execute("delete_user", `discord_user_id=${discordUserId}`, () => this.controller.deleteUser(discordUserId));
  }

  syncUserRoles(discordUserId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    return this.execute("sync_user_roles", `discord_user_id=${discordUserId}, role_ids=${roleIds.join(",")}`, () => this.controller.syncUserRoles(discordUserId, roleIds));
  }

  getRoles(): Promise<DbRole[]> {
    return this.controller.getRoles();
  }

  getRole(roleId: Snowflake): Promise<DbRole | null> {
    return this.controller.getRole(roleId);
  }

  createRole(roleId: Snowflake, roleName: string, permissions: number): Promise<DbRole> {
    return this.execute("create_role", `role_id=${roleId}`, () => this.controller.createRole(roleId, roleName, permissions));
  }

  updateRole(roleId: Snowflake, roleName: string | null = null, permissions: number | null = null): Promise<DbRole | null> {
    return this.execute("update_role", `role_id=${roleId}`, () => this.controller.updateRole(roleId, roleName, permissions));
  }

  deleteRole(roleId: Snowflake): Promise<boolean> {
    return this.execute("delete_role", `role_id=${roleId}`, () => this.controller.deleteRole(roleId));
  }

  getCategories(): Promise<DbCategory[]> {
    return this.controller.getCategories();
  }

  getCategory(categoryId: Snowflake): Promise<DbCategory | null> {
    return this.controller.getCategory(categoryId);
  }

  createCategory(categoryId: Snowflake, categoryName: string): Promise<DbCategory> {
    return this.execute("create_category", `category_id=${categoryId}`, () => this.controller.createCategory(categoryId, categoryName));
  }

  deleteCategory(categoryId: Snowflake): Promise<boolean> {
    return this.execute("delete_category", `category_id=${categoryId}`, () => this.controller.deleteCategory(categoryId));
  }

  syncCategoryPermissions(categoryId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    return this.execute("sync_category_permissions", `category_id=${categoryId}, role_ids=${roleIds.join(",")}`, () => this.controller.syncCategoryPermissions(categoryId, roleIds));
  }

  getChannels(): Promise<DbChannel[]> {
    return this.controller.getChannels();
  }

  getChannel(channelId: Snowflake): Promise<DbChannel | null> {
    return this.controller.getChannel(channelId);
  }

  createChannel(channelId: Snowflake, channelName: string, categoryId: Snowflake, allowedRoleIds: Snowflake[] | null = null): Promise<DbChannel> {
    return this.execute("create_channel", `channel_id=${channelId}`, () => this.controller.createChannel(channelId, channelName, categoryId, allowedRoleIds));
  }

  deleteChannel(channelId: Snowflake): Promise<boolean> {
    return this.execute("delete_channel", `channel_id=${channelId}`, () => this.controller.deleteChannel(channelId));
  }

  syncChannelPermissions(channelId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    return this.execute("sync_channel_permissions", `channel_id=${channelId}, role_ids=${roleIds.join(",")}`, () => this.controller.syncChannelPermissions(channelId, roleIds));
  }

  private async execute<T extends MutationResult>(operation: string, target: string, action: () => Promise<T>): Promise<T> {
    try {
      const result = await action();
      await this.sendLog(operation, result === false || result === null ? "failure" : "success", target, summarize(result));
      return result;
    } catch (error) {
      await this.sendLog(operation, "failure", target, error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      throw error;
    }
  }

  private async sendLog(operation: string, status: string, target: string, detail: string): Promise<void> {
    try {
      await this.discordController.createMessage(this.logChannelId, [
        "[DB LOG]",
        `operation: ${operation}`,
        `status: ${status}`,
        `target: ${target}`,
        `detail: ${detail}`,
      ].join("\n"));
    } catch (error) {
      console.warn("Failed to send DB log to Discord", error);
    }
  }
}

function summarize(result: MutationResult): string {
  if (typeof result === "boolean" || typeof result === "number" || result === null) {
    return `returned ${String(result)}`;
  }
  if ("discordUserId" in result) {
    return `user discord_user_id=${result.discordUserId} display_name=${result.displayName}`;
  }
  if ("roleId" in result) {
    return `role role_id=${result.roleId} role_name=${result.roleName}`;
  }
  if ("channelId" in result) {
    return `channel channel_id=${result.channelId} channel_name=${result.channelName}`;
  }
  if ("categoryId" in result) {
    return `category category_id=${result.categoryId} category_name=${result.categoryName}`;
  }
  return JSON.stringify(result);
}
