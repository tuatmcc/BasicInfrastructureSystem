import { z } from 'zod';
import {
  CommunityAccountProfileSchema,
  CommunityMembershipSchema,
  CommunityMessageAuthorSchema,
  CommunityMessageSchema,
  CommunityReactionUserSchema,
  CommunityRoleSchema,
  SendMessageInputSchema,
} from '../type';

// Discord refinements of the neutral port types. Only this adapter knows that
// Discord identifiers are snowflakes, so the format is asserted here rather
// than in the port every other provider would also have to satisfy.
export const DiscordSnowflakeSchema = z.string().regex(/^\d{17,20}$/);

export const DiscordRoleSchema = CommunityRoleSchema.extend({
  id: DiscordSnowflakeSchema,
});

export const DiscordAccountProfileSchema = CommunityAccountProfileSchema.extend({
  id: DiscordSnowflakeSchema,
});

export const DiscordMembershipSchema = CommunityMembershipSchema.extend({
  userId: DiscordSnowflakeSchema,
  roles: z.array(DiscordRoleSchema),
});

export const DiscordSendMessageInputSchema = SendMessageInputSchema.extend({
  channelId: DiscordSnowflakeSchema,
  mentionRoleIds: z.array(DiscordSnowflakeSchema).max(100).optional(),
});

export const DiscordMessageAuthorSchema = CommunityMessageAuthorSchema.extend({
  id: DiscordSnowflakeSchema,
});

export const DiscordMessageSchema = CommunityMessageSchema.extend({
  id: DiscordSnowflakeSchema,
  channelId: DiscordSnowflakeSchema,
  author: DiscordMessageAuthorSchema,
});

export const DiscordReactionUserSchema = CommunityReactionUserSchema.extend({
  id: DiscordSnowflakeSchema,
});

// Discord rejects a message body longer than this once mentions are prepended.
export const DISCORD_MESSAGE_CONTENT_LIMIT = 2000;
