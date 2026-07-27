import { z } from 'zod';

// This module is the community port's vocabulary. It must stay free of any one
// provider's shapes so a provider can be replaced without touching callers.
// Provider-specific formats and limits belong in that provider's adapter — see
// discord/schema.ts for the Discord refinements of these types.

// Identifiers are opaque here. Discord issues snowflakes, another provider will
// not, so only the adapter that issues an ID may constrain its format.
export const CommunityIdSchema = z.string().min(1);

// --- role schemas ---
export const CommunityRoleSchema = z.object({
  id: CommunityIdSchema,
  name: z.string(),
});
export type CommunityRole = z.infer<typeof CommunityRoleSchema>;

// The profile of a linked community account, as returned by the provider's
// account authorization flow.
export const CommunityAccountProfileSchema = z.object({
  id: CommunityIdSchema,
  username: z.string().min(1),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type CommunityAccountProfile = z.infer<typeof CommunityAccountProfileSchema>;

// Evidence that an account belongs to a specific community.
export const CommunityMembershipSchema = z.object({
  userId: CommunityIdSchema,
  nickname: z.string().nullable(),
  roles: z.array(CommunityRoleSchema),
});
export type CommunityMembership = z.infer<typeof CommunityMembershipSchema>;

export const GetUserRolesInputSchema = z.object({
  userId: z.string(),
});
export type GetUserRolesInput = z.infer<typeof GetUserRolesInputSchema>;

// --- message schemas ---
// イベント通知メッセージの送信に使う入出力定義
export const SendMessageInputSchema = z.object({
  channelId: CommunityIdSchema,
  // Per-provider length limits are enforced by the adapter, which is the only
  // layer that knows what its API accepts.
  content: z.string().min(1),
  // メンションするロールID一覧（省略可）
  mentionRoleIds: z.array(CommunityIdSchema).max(100).optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const SendMessageResultSchema = z.object({
  messageId: z.string(),
});
export type SendMessageResult = z.infer<typeof SendMessageResultSchema>;

export const CommunityMessageAuthorSchema = z.object({
  id: CommunityIdSchema,
  username: z.string(),
  displayName: z.string().nullable(),
  bot: z.boolean(),
});
export type CommunityMessageAuthor = z.infer<typeof CommunityMessageAuthorSchema>;

export const CommunityMessageReactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
});
export type CommunityMessageReaction = z.infer<typeof CommunityMessageReactionSchema>;

export const CommunityMessageSchema = z.object({
  id: CommunityIdSchema,
  channelId: CommunityIdSchema,
  content: z.string(),
  createdAt: z.string(),
  author: CommunityMessageAuthorSchema,
  reactions: z.array(CommunityMessageReactionSchema),
});
export type CommunityMessage = z.infer<typeof CommunityMessageSchema>;

export const CommunityReactionUserSchema = z.object({
  id: CommunityIdSchema,
  username: z.string(),
  displayName: z.string().nullable(),
  bot: z.boolean(),
});
export type CommunityReactionUser = z.infer<typeof CommunityReactionUserSchema>;
