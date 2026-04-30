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

export interface IDiscordController {
  createRole(name: string, color?: RgbColor | null, position?: number | null): Promise<RoleData>;
  deleteRole(id: Snowflake): Promise<boolean>;
  listRoles(): Promise<RoleData[]>;
  listRoleMembers(roleId: Snowflake): Promise<MemberData[]>;
  createChannel(name: string, categoryId?: Snowflake | null, position?: number | null): Promise<ChannelData>;
  deleteChannel(id: Snowflake): Promise<boolean>;
  listChannels(): Promise<ChannelData[]>;
  listChannelRoles(channelId: Snowflake): Promise<RoleData[]>;
  createCategory(name: string, position?: number | null): Promise<CategoryData>;
  deleteCategory(id: Snowflake): Promise<boolean>;
  listCategories(): Promise<CategoryData[]>;
  listMembers(): Promise<MemberData[]>;
  listMemberRoles(memberId: Snowflake): Promise<RoleData[]>;
  banMember(id: Snowflake): Promise<boolean>;
  kickMember(id: Snowflake): Promise<boolean>;
  createMessage(channelId: Snowflake, content: string): Promise<MessageData>;
  deleteMessage(channelId: Snowflake, messageId: Snowflake): Promise<boolean>;
  totalReactions(channelId: Snowflake, messageId: Snowflake): Promise<ReactionData[]>;
}
