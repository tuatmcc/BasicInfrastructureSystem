import type { community } from "../interface";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordRole {
  id: Snowflake;
  name: string;
  color: number;
  position: number;
  permissions?: string;
}

interface DiscordChannel {
  id: Snowflake;
  name: string;
  type: number;
  parent_id?: Snowflake | null;
  position?: number;
  permission_overwrites?: Array<{ id: Snowflake; type: number }>;
}

interface DiscordMember {
  user?: { id: Snowflake; username?: string; global_name?: string | null };
  nick?: string | null;
  roles?: Snowflake[];
}

interface DiscordMessage {
  id: Snowflake;
  content: string;
  author: { id: Snowflake };
  channel_id: Snowflake;
  reactions?: Array<{ emoji: { id?: Snowflake | null; name?: string | null }; me: boolean; count: number }>;
}

function rgbToInteger(color: RgbColor): number {
  return (color[0] << 16) + (color[1] << 8) + color[2];
}

function integerToRgb(color: number): RgbColor {
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

function roleFromDiscord(role: DiscordRole): RoleData {
  return {
    id: role.id,
    name: role.name,
    color: integerToRgb(role.color ?? 0),
    position: role.position ?? 0,
    permissions: Number.parseInt(role.permissions ?? "0", 10),
  };
}

function channelFromDiscord(channel: DiscordChannel): ChannelData {
  return {
    id: channel.id,
    name: channel.name,
    categoryId: channel.parent_id ?? null,
    position: channel.position ?? 0,
  };
}

function categoryFromDiscord(channel: DiscordChannel): CategoryData {
  return {
    id: channel.id,
    name: channel.name,
    position: channel.position ?? 0,
  };
}

function memberFromDiscord(member: DiscordMember): MemberData {
  const user = member.user;
  return {
    id: user?.id ?? "",
    name: member.nick ?? user?.global_name ?? user?.username ?? "",
  };
}

function messageFromDiscord(message: DiscordMessage): MessageData {
  return {
    id: message.id,
    content: message.content,
    authorId: message.author.id,
    channelId: message.channel_id,
  };
}

export class DiscordRestController implements IDiscordController {
  private readonly token: string;
  private readonly guildId: Snowflake;

  constructor(private readonly env: Env) {
    this.token = requireEnv(env, "DISCORD_BOT_TOKEN");
    this.guildId = getDiscordGuildId(env);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      const init: RequestInit = {
        method,
        headers: {
          Authorization: `Bot ${this.token}`,
          "Content-Type": "application/json",
          "User-Agent": "DiscordConnectorWorkers/0.1",
        },
      };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }
      response = await fetch(`${DISCORD_API_BASE}${path}`, {
        ...init,
      });
    } catch (error) {
      console.warn("Discord request failed", error);
      throw new DiscordConnectionError("Failed to connect to Discord");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const data = text.length > 0 ? JSON.parse(text) as unknown : undefined;
    if (response.ok) {
      return data as T;
    }

    const message = typeof data === "object" && data !== null && "message" in data
      ? String((data as { message: unknown }).message)
      : response.statusText;

    if (response.status === 401) {
      throw new DiscordConnectionError("Discord login failed. Check the bot token.");
    }
    if (response.status === 403) {
      throw new DiscordError(`No permission for Discord request ${method} ${path}: ${message}`);
    }
    if (response.status === 404) {
      throw new DiscordError(`No such Discord resource for request ${method} ${path}`);
    }
    throw new DiscordError(`HTTP error while calling Discord ${method} ${path}: ${message}`);
  }

  async createRole(name: string, color?: RgbColor | null, position?: number | null): Promise<RoleData> {
    const role = await this.request<DiscordRole>("POST", `/guilds/${this.guildId}/roles`, {
      name,
      ...(color === undefined || color === null ? {} : { color: rgbToInteger(color) }),
    });
    if (position !== undefined && position !== null) {
      await this.request<unknown>("PATCH", `/guilds/${this.guildId}/roles`, [{ id: role.id, position }]);
      const roles = await this.listRoles();
      return roles.find((candidate) => candidate.id === role.id) ?? { ...roleFromDiscord(role), position };
    }
    return roleFromDiscord(role);
  }

  async deleteRole(id: Snowflake): Promise<boolean> {
    await this.request<void>("DELETE", `/guilds/${this.guildId}/roles/${id}`);
    return true;
  }

  async listRoles(): Promise<RoleData[]> {
    const roles = await this.request<DiscordRole[]>("GET", `/guilds/${this.guildId}/roles`);
    return roles.map(roleFromDiscord);
  }

  async listRoleMembers(roleId: Snowflake): Promise<MemberData[]> {
    const members = await this.listMembersWithDetails();
    return members.filter((member) => member.roles?.includes(roleId)).map(memberFromDiscord);
  }

  async createChannel(name: string, categoryId?: Snowflake | null, position?: number | null): Promise<ChannelData> {
    const channel = await this.request<DiscordChannel>("POST", `/guilds/${this.guildId}/channels`, {
      name,
      type: 0,
      ...(categoryId === undefined || categoryId === null ? {} : { parent_id: categoryId }),
      ...(position === undefined || position === null ? {} : { position }),
    });
    return channelFromDiscord(channel);
  }

  async deleteChannel(id: Snowflake): Promise<boolean> {
    await this.request<DiscordChannel>("DELETE", `/channels/${id}`);
    return true;
  }

  async listChannels(): Promise<ChannelData[]> {
    const channels = await this.request<DiscordChannel[]>("GET", `/guilds/${this.guildId}/channels`);
    return channels.filter((channel) => channel.type === 0).map(channelFromDiscord);
  }

  async listChannelRoles(channelId: Snowflake): Promise<RoleData[]> {
    const [channels, roles] = await Promise.all([
      this.request<DiscordChannel[]>("GET", `/guilds/${this.guildId}/channels`),
      this.listRoles(),
    ]);
    const channel = channels.find((candidate) => candidate.id === channelId);
    if (channel === undefined) {
      throw new DiscordError(`No such channel found: ${channelId}`);
    }
    const changedRoleIds = new Set(
      (channel.permission_overwrites ?? [])
        .filter((overwrite) => overwrite.type === 0)
        .map((overwrite) => overwrite.id),
    );
    return roles.filter((role) => changedRoleIds.has(role.id));
  }

  async createCategory(name: string, position?: number | null): Promise<CategoryData> {
    const category = await this.request<DiscordChannel>("POST", `/guilds/${this.guildId}/channels`, {
      name,
      type: 4,
      ...(position === undefined || position === null ? {} : { position }),
    });
    return categoryFromDiscord(category);
  }

  async deleteCategory(id: Snowflake): Promise<boolean> {
    await this.request<DiscordChannel>("DELETE", `/channels/${id}`);
    return true;
  }

  async listCategories(): Promise<CategoryData[]> {
    const channels = await this.request<DiscordChannel[]>("GET", `/guilds/${this.guildId}/channels`);
    return channels.filter((channel) => channel.type === 4).map(categoryFromDiscord);
  }

  async listMembers(): Promise<MemberData[]> {
    return (await this.listMembersWithDetails()).map(memberFromDiscord);
  }

  async listMemberRoles(memberId: Snowflake): Promise<RoleData[]> {
    const [member, roles] = await Promise.all([
      this.request<DiscordMember>("GET", `/guilds/${this.guildId}/members/${memberId}`),
      this.listRoles(),
    ]);
    const roleIds = new Set(member.roles ?? []);
    return roles.filter((role) => roleIds.has(role.id));
  }

  async banMember(id: Snowflake): Promise<boolean> {
    await this.request<void>("PUT", `/guilds/${this.guildId}/bans/${id}`, { delete_message_seconds: 0 });
    return true;
  }

  async kickMember(id: Snowflake): Promise<boolean> {
    await this.request<void>("DELETE", `/guilds/${this.guildId}/members/${id}`);
    return true;
  }

  async createMessage(channelId: Snowflake, content: string): Promise<MessageData> {
    const message = await this.request<DiscordMessage>("POST", `/channels/${channelId}/messages`, { content });
    return messageFromDiscord(message);
  }

  async deleteMessage(channelId: Snowflake, messageId: Snowflake): Promise<boolean> {
    await this.request<void>("DELETE", `/channels/${channelId}/messages/${messageId}`);
    return true;
  }

  async totalReactions(channelId: Snowflake, messageId: Snowflake): Promise<ReactionData[]> {
    const message = await this.request<DiscordMessage>("GET", `/channels/${channelId}/messages/${messageId}`);
    return await Promise.all((message.reactions ?? []).map(async (reaction) => {
      const emoji = reaction.emoji.id === undefined || reaction.emoji.id === null
        ? reaction.emoji.name ?? ""
        : `${reaction.emoji.name ?? ""}:${reaction.emoji.id}`;
      const encodedEmoji = encodeURIComponent(emoji);
      const users = await this.request<Array<{ id: Snowflake }>>(
        "GET",
        `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}?limit=100`,
      );
      return {
        emoji,
        memberIds: users.map((user) => user.id),
        me: reaction.me,
        messageId: message.id,
      };
    }));
  }

  private async listMembersWithDetails(): Promise<DiscordMember[]> {
    const allMembers: DiscordMember[] = [];
    let after = "0";
    while (true) {
      const members = await this.request<DiscordMember[]>(
        "GET",
        `/guilds/${this.guildId}/members?limit=1000&after=${after}`,
      );
      allMembers.push(...members);
      if (members.length < 1000) {
        return allMembers;
      }
      const lastUserId = members.at(-1)?.user?.id;
      if (lastUserId === undefined) {
        return allMembers;
      }
      after = lastUserId;
    }
  }
}