export type Snowflake = string;
export type RgbColor = [number, number, number];

export interface RoleData {
  id: Snowflake;
  name: string;
  color: RgbColor;
  position: number;
  permissions?: number;
}

export interface ChannelData {
  id: Snowflake;
  name: string;
  categoryId: Snowflake | null;
  position: number;
}

export interface CategoryData {
  id: Snowflake;
  name: string;
  position: number;
}

export interface MemberData {
  id: Snowflake;
  name: string;
}

export interface MessageData {
  id: Snowflake;
  content: string;
  authorId: Snowflake;
  channelId: Snowflake;
}

export interface ReactionData {
  emoji: string;
  memberIds: Snowflake[];
  me: boolean;
  messageId: Snowflake;
}

export interface DbUser {
  discordUserId: Snowflake;
  displayName: string;
  memberId: string | null;
  roleIds: Snowflake[];
}

export interface DbRole {
  roleId: Snowflake;
  roleName: string;
  permissions: number;
}

export interface DbChannel {
  channelId: Snowflake;
  channelName: string;
  categoryId: Snowflake;
  roleIds: Snowflake[];
}

export interface DbCategory {
  categoryId: Snowflake;
  categoryName: string;
  channels: DbChannel[];
  roleIds: Snowflake[];
}
