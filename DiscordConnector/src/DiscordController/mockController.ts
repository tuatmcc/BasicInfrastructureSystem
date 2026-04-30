import type {
  CategoryData,
  ChannelData,
  MemberData,
  MessageData,
  ReactionData,
  RgbColor,
  RoleData,
  Snowflake,
} from "../types";
import type { IDiscordController } from "./interface";

export class MockDiscordController implements IDiscordController {
  private nextId = 1000n;
  private roles: RoleData[] = [
    { id: "100", name: "Admin", color: [255, 0, 0], position: 1, permissions: 8 },
    { id: "101", name: "Operator", color: [0, 128, 255], position: 2, permissions: 4 },
    { id: "102", name: "Member", color: [128, 128, 128], position: 3, permissions: 0 },
  ];
  private categories: CategoryData[] = [{ id: "300", name: "General", position: 1 }];
  private channels: ChannelData[] = [
    { id: "400", name: "general", categoryId: "300", position: 1 },
    { id: "401", name: "random", categoryId: "300", position: 2 },
  ];
  private members: MemberData[] = [
    { id: "200", name: "alice" },
    { id: "201", name: "bob" },
  ];

  async createRole(name: string, color: RgbColor | null = null, position: number | null = null): Promise<RoleData> {
    const role = {
      id: this.allocateId(),
      name,
      color: color ?? [0, 0, 0],
      position: position ?? this.roles.length,
      permissions: 0,
    } satisfies RoleData;
    this.roles.push(role);
    return role;
  }

  async deleteRole(id: Snowflake): Promise<boolean> {
    this.roles = this.roles.filter((role) => role.id !== id);
    return true;
  }

  async listRoles(): Promise<RoleData[]> {
    return [...this.roles];
  }

  async listRoleMembers(_roleId: Snowflake): Promise<MemberData[]> {
    return [...this.members];
  }

  async createChannel(name: string, categoryId: Snowflake | null = null, position: number | null = null): Promise<ChannelData> {
    const channel = {
      id: this.allocateId(),
      name,
      categoryId,
      position: position ?? this.channels.length,
    };
    this.channels.push(channel);
    return channel;
  }

  async deleteChannel(id: Snowflake): Promise<boolean> {
    this.channels = this.channels.filter((channel) => channel.id !== id);
    return true;
  }

  async listChannels(): Promise<ChannelData[]> {
    return [...this.channels];
  }

  async listChannelRoles(_channelId: Snowflake): Promise<RoleData[]> {
    return this.roles.slice(0, 1);
  }

  async createCategory(name: string, position: number | null = null): Promise<CategoryData> {
    const category = {
      id: this.allocateId(),
      name,
      position: position ?? this.categories.length,
    };
    this.categories.push(category);
    return category;
  }

  async deleteCategory(id: Snowflake): Promise<boolean> {
    this.categories = this.categories.filter((category) => category.id !== id);
    return true;
  }

  async listCategories(): Promise<CategoryData[]> {
    return [...this.categories];
  }

  async listMembers(): Promise<MemberData[]> {
    return [...this.members];
  }

  async listMemberRoles(_memberId: Snowflake): Promise<RoleData[]> {
    return this.roles.slice(0, 2);
  }

  async banMember(id: Snowflake): Promise<boolean> {
    this.members = this.members.filter((member) => member.id !== id);
    return true;
  }

  async kickMember(id: Snowflake): Promise<boolean> {
    this.members = this.members.filter((member) => member.id !== id);
    return true;
  }

  async createMessage(channelId: Snowflake, content: string): Promise<MessageData> {
    return {
      id: this.allocateId(),
      content,
      authorId: "999",
      channelId,
    };
  }

  async deleteMessage(_channelId: Snowflake, _messageId: Snowflake): Promise<boolean> {
    return true;
  }

  async totalReactions(_channelId: Snowflake, messageId: Snowflake): Promise<ReactionData[]> {
    return [{ emoji: "thumbsup", memberIds: this.members.map((member) => member.id), me: false, messageId }];
  }

  private allocateId(): Snowflake {
    this.nextId += 1n;
    return this.nextId.toString();
  }
}
