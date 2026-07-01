import { z } from 'zod';

export const DiscordSnowflakeSchema = z.string().regex(/^\d{17,20}$/);

// --- role schemas ---
export const RoleSchema = z.object({
  id: DiscordSnowflakeSchema,
  name: z.string(),
});
export type Role = z.infer<typeof RoleSchema>;

export const GetUserRolesInputSchema = z.object({
  userId: z.string(),
});
export type GetUserRolesInput = z.infer<typeof GetUserRolesInputSchema>;

// --- message schemas ---
// イベント通知メッセージの送信に使う入出力定義
export const SendMessageInputSchema = z.object({
  channelId: DiscordSnowflakeSchema,
  content: z.string().min(1).max(2000),
  // メンションするロールID一覧（省略可）
  mentionRoleIds: z.array(DiscordSnowflakeSchema).max(100).optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const SendMessageResultSchema = z.object({
  messageId: z.string(),
});
export type SendMessageResult = z.infer<typeof SendMessageResultSchema>;

export const DiscordMessageAuthorSchema = z.object({
  id: DiscordSnowflakeSchema,
  username: z.string(),
  globalName: z.string().nullable(),
  bot: z.boolean(),
});
export type DiscordMessageAuthor = z.infer<typeof DiscordMessageAuthorSchema>;

export const DiscordMessageReactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
});
export type DiscordMessageReaction = z.infer<typeof DiscordMessageReactionSchema>;

export const DiscordMessageSchema = z.object({
  id: DiscordSnowflakeSchema,
  channelId: DiscordSnowflakeSchema,
  content: z.string(),
  createdAt: z.string(),
  author: DiscordMessageAuthorSchema,
  reactions: z.array(DiscordMessageReactionSchema),
});
export type DiscordMessage = z.infer<typeof DiscordMessageSchema>;

export const DiscordReactionUserSchema = z.object({
  id: DiscordSnowflakeSchema,
  username: z.string(),
  globalName: z.string().nullable(),
  bot: z.boolean(),
});
export type DiscordReactionUser = z.infer<typeof DiscordReactionUserSchema>;
