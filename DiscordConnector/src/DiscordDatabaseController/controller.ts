import pg from "pg";
import { DatabaseError } from "../errors";
import type { DbCategory, DbChannel, DbRole, DbUser, Snowflake } from "../types";
import type { IDiscordDatabaseController } from "./interface";

const { Client } = pg;

type Row = Record<string, unknown>;

export class DiscordDatabaseController implements IDiscordDatabaseController {
  constructor(private readonly env: Env) {}

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async getUsers(memberId?: string | null): Promise<DbUser[]> {
    const rows = await this.query<Row>(
      `select u.discord_user_id, u.display_name, u.member_id,
              coalesce(array_agg(ur.role_id) filter (where ur.role_id is not null), '{}') as role_ids
         from users u
         left join user_role ur on ur.discord_user_id = u.discord_user_id
        where ($1::text is null or u.member_id::text = $1)
        group by u.discord_user_id, u.display_name, u.member_id
        order by u.discord_user_id`,
      [memberId ?? null],
    );
    return rows.map(userFromRow);
  }

  async getUser(discordUserId: Snowflake): Promise<DbUser | null> {
    const users = await this.getUsersByIds([discordUserId]);
    return users[0] ?? null;
  }

  async createUser(discordUserId: Snowflake, displayName: string, memberId: string | null = null): Promise<DbUser> {
    try {
      await this.query(
        "insert into users (discord_user_id, display_name, member_id) values ($1, $2, $3)",
        [discordUserId, displayName, memberId],
      );
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw new DatabaseError(`User ${discordUserId} already exists`);
      }
      throw error;
    }
    return { discordUserId, displayName, memberId, roleIds: [] };
  }

  async updateUser(discordUserId: Snowflake, displayName: string, memberId: string | null = null): Promise<DbUser | null> {
    const rows = await this.query<Row>(
      "update users set display_name = $2, member_id = $3 where discord_user_id = $1 returning discord_user_id, display_name, member_id",
      [discordUserId, displayName, memberId],
    );
    if (rows.length === 0) {
      return null;
    }
    return this.getUser(discordUserId);
  }

  async deleteUser(discordUserId: Snowflake): Promise<boolean> {
    const rows = await this.query<Row>("delete from users where discord_user_id = $1 returning discord_user_id", [discordUserId]);
    return rows.length > 0;
  }

  async syncUserRoles(discordUserId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    if (await this.getUser(discordUserId) === null) {
      throw new DatabaseError(`User ${discordUserId} not found`);
    }
    await this.transaction(async (client) => {
      await client.query("delete from user_role where discord_user_id = $1", [discordUserId]);
      for (const roleId of roleIds) {
        await client.query(
          `insert into user_role (discord_user_id, role_id)
           select $1, role_id from roles where role_id = $2
           on conflict do nothing`,
          [discordUserId, roleId],
        );
      }
    });
    return this.countUserRoles(discordUserId);
  }

  async getRoles(): Promise<DbRole[]> {
    const rows = await this.query<Row>("select role_id, role_name from roles order by role_id");
    return rows.map(roleFromRow);
  }

  async getRole(roleId: Snowflake): Promise<DbRole | null> {
    const rows = await this.query<Row>("select role_id, role_name from roles where role_id = $1", [roleId]);
    return rows[0] === undefined ? null : roleFromRow(rows[0]);
  }

  async createRole(roleId: Snowflake, roleName: string, permissions: number): Promise<DbRole> {
    await this.query("insert into roles (role_id, role_name) values ($1, $2)", [roleId, roleName]);
    return { roleId, roleName, permissions };
  }

  async updateRole(roleId: Snowflake, roleName: string | null = null, permissions: number | null = null): Promise<DbRole | null> {
    const existing = await this.getRole(roleId);
    if (existing === null) {
      return null;
    }
    const nextName = roleName ?? existing.roleName;
    await this.query("update roles set role_name = $2 where role_id = $1", [roleId, nextName]);
    return { roleId, roleName: nextName, permissions: permissions ?? 0 };
  }

  async deleteRole(roleId: Snowflake): Promise<boolean> {
    const rows = await this.query<Row>("delete from roles where role_id = $1 returning role_id", [roleId]);
    return rows.length > 0;
  }

  async getCategories(): Promise<DbCategory[]> {
    const rows = await this.query<Row>("select category_id, category_name from categories order by category_id");
    const categories = await Promise.all(rows.map(categoryFromRow).map(async (category) => ({
      ...category,
      channels: await this.getChannelsByCategory(category.categoryId),
      roleIds: await this.getRoleIds("category_role", "category_id", category.categoryId),
    })));
    return categories;
  }

  async getCategory(categoryId: Snowflake): Promise<DbCategory | null> {
    const rows = await this.query<Row>("select category_id, category_name from categories where category_id = $1", [categoryId]);
    if (rows.length === 0) {
      return null;
    }
    const category = categoryFromRow(rows[0]!);
    return {
      ...category,
      channels: await this.getChannelsByCategory(categoryId),
      roleIds: await this.getRoleIds("category_role", "category_id", categoryId),
    };
  }

  async createCategory(categoryId: Snowflake, categoryName: string): Promise<DbCategory> {
    await this.query("insert into categories (category_id, category_name) values ($1, $2)", [categoryId, categoryName]);
    return { categoryId, categoryName, channels: [], roleIds: [] };
  }

  async deleteCategory(categoryId: Snowflake): Promise<boolean> {
    const rows = await this.query<Row>("delete from categories where category_id = $1 returning category_id", [categoryId]);
    return rows.length > 0;
  }

  async syncCategoryPermissions(categoryId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    if (await this.getCategory(categoryId) === null) {
      throw new DatabaseError(`Category ${categoryId} not found`);
    }
    await this.syncRoles("category_role", "category_id", categoryId, roleIds);
    return this.getRoleIds("category_role", "category_id", categoryId).then((ids) => ids.length);
  }

  async getChannels(): Promise<DbChannel[]> {
    const rows = await this.query<Row>("select channel_id, channel_name, category_id from channels order by channel_id");
    return Promise.all(rows.map((row) => this.channelFromRowWithRoles(row)));
  }

  async getChannel(channelId: Snowflake): Promise<DbChannel | null> {
    const rows = await this.query<Row>("select channel_id, channel_name, category_id from channels where channel_id = $1", [channelId]);
    return rows[0] === undefined ? null : this.channelFromRowWithRoles(rows[0]);
  }

  async createChannel(channelId: Snowflake, channelName: string, categoryId: Snowflake, allowedRoleIds: Snowflake[] | null = null): Promise<DbChannel> {
    if (await this.getCategory(categoryId) === null) {
      throw new DatabaseError(`Category ${categoryId} not found`);
    }
    await this.transaction(async (client) => {
      await client.query(
        "insert into channels (channel_id, channel_name, category_id) values ($1, $2, $3)",
        [channelId, channelName, categoryId],
      );
      for (const roleId of allowedRoleIds ?? []) {
        await client.query(
          `insert into channel_role (channel_id, role_id)
           select $1, role_id from roles where role_id = $2
           on conflict do nothing`,
          [channelId, roleId],
        );
      }
    });
    return { channelId, channelName, categoryId, roleIds: await this.getRoleIds("channel_role", "channel_id", channelId) };
  }

  async deleteChannel(channelId: Snowflake): Promise<boolean> {
    const rows = await this.query<Row>("delete from channels where channel_id = $1 returning channel_id", [channelId]);
    return rows.length > 0;
  }

  async syncChannelPermissions(channelId: Snowflake, roleIds: Snowflake[]): Promise<number> {
    if (await this.getChannel(channelId) === null) {
      throw new DatabaseError(`Channel ${channelId} not found`);
    }
    await this.syncRoles("channel_role", "channel_id", channelId, roleIds);
    return this.getRoleIds("channel_role", "channel_id", channelId).then((ids) => ids.length);
  }

  private async getUsersByIds(ids: Snowflake[]): Promise<DbUser[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.query<Row>(
      `select u.discord_user_id, u.display_name, u.member_id,
              coalesce(array_agg(ur.role_id) filter (where ur.role_id is not null), '{}') as role_ids
         from users u
         left join user_role ur on ur.discord_user_id = u.discord_user_id
        where u.discord_user_id = any($1::text[])
        group by u.discord_user_id, u.display_name, u.member_id`,
      [ids],
    );
    return rows.map(userFromRow);
  }

  private async countUserRoles(discordUserId: Snowflake): Promise<number> {
    const rows = await this.query<Row>("select count(*)::int as count from user_role where discord_user_id = $1", [discordUserId]);
    return Number(rows[0]?.count ?? 0);
  }

  private async getChannelsByCategory(categoryId: Snowflake): Promise<DbChannel[]> {
    const rows = await this.query<Row>("select channel_id, channel_name, category_id from channels where category_id = $1 order by channel_id", [categoryId]);
    return Promise.all(rows.map((row) => this.channelFromRowWithRoles(row)));
  }

  private async channelFromRowWithRoles(row: Row): Promise<DbChannel> {
    const channel = channelFromRow(row);
    return { ...channel, roleIds: await this.getRoleIds("channel_role", "channel_id", channel.channelId) };
  }

  private async getRoleIds(table: "user_role" | "category_role" | "channel_role", idColumn: string, id: Snowflake): Promise<Snowflake[]> {
    const rows = await this.query<Row>(`select role_id from ${table} where ${idColumn} = $1 order by role_id`, [id]);
    return rows.map((row) => String(row.role_id));
  }

  private async syncRoles(table: "category_role" | "channel_role", idColumn: string, id: Snowflake, roleIds: Snowflake[]): Promise<void> {
    await this.transaction(async (client) => {
      await client.query(`delete from ${table} where ${idColumn} = $1`, [id]);
      for (const roleId of roleIds) {
        await client.query(
          `insert into ${table} (${idColumn}, role_id)
           select $1, role_id from roles where role_id = $2
           on conflict do nothing`,
          [id, roleId],
        );
      }
    });
  }

  private async query<T extends Row>(sql: string, values: unknown[] = []): Promise<T[]> {
    const client = new Client({ connectionString: this.env.HYPERDRIVE.connectionString });
    await client.connect();
    try {
      const result = await client.query<T>(sql, values);
      return result.rows;
    } finally {
      await client.end();
    }
  }

  private async transaction(action: (client: pg.Client) => Promise<void>): Promise<void> {
    const client = new Client({ connectionString: this.env.HYPERDRIVE.connectionString });
    await client.connect();
    try {
      await client.query("begin");
      await action(client);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      await client.end();
    }
  }
}

function userFromRow(row: Row): DbUser {
  return {
    discordUserId: String(row.discord_user_id),
    displayName: String(row.display_name),
    memberId: row.member_id === null ? null : String(row.member_id),
    roleIds: Array.isArray(row.role_ids) ? row.role_ids.map(String) : [],
  };
}

function roleFromRow(row: Row): DbRole {
  return {
    roleId: String(row.role_id),
    roleName: String(row.role_name),
    permissions: 0,
  };
}

function categoryFromRow(row: Row): DbCategory {
  return {
    categoryId: String(row.category_id),
    categoryName: String(row.category_name),
    channels: [],
    roleIds: [],
  };
}

function channelFromRow(row: Row): DbChannel {
  return {
    channelId: String(row.channel_id),
    channelName: String(row.channel_name),
    categoryId: String(row.category_id),
    roleIds: [],
  };
}

function isPgUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
