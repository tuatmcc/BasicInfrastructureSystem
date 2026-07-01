import type { DiscordProvider } from './main';
import { CommunityProviderError } from '../error';
import {
  DiscordMessage,
  DiscordMessageSchema,
  DiscordReactionUser,
  DiscordReactionUserSchema,
  SendMessageInput,
  SendMessageInputSchema,
  SendMessageResult,
  SendMessageResultSchema
} from '../type';

// チャンネルへメッセージを送信し、送信したメッセージIDを返す
export async function sendMessageAPI(
  provider: DiscordProvider,
  input: SendMessageInput
): Promise<SendMessageResult> {
  const parsedInput = SendMessageInputSchema.parse(input);
  const roleIds = parsedInput.mentionRoleIds ?? [];

  // メンション対象のロールをメッセージ本文に埋め込む（<@&ロールID>）
  const mentions = roleIds.map((id) => `<@&${id}>`).join(' ');
  const content = mentions ? `${mentions} ${parsedInput.content}` : parsedInput.content;

  if (content.length > 2000) {
    throw new CommunityProviderError('Discord message content is too long', 400, 'discord');
  }

  const message = await provider.request<any>(
    'POST',
    `/channels/${parsedInput.channelId}/messages`,
    {
      content,
      // 埋め込んだロールメンションのみ実際に通知する
      allowed_mentions: { roles: roleIds },
    }
  );

  return SendMessageResultSchema.parse({
    messageId: message.id,
  });
}

export async function getMessageAPI(
  provider: DiscordProvider,
  channelId: string,
  messageId: string
): Promise<DiscordMessage> {
  const message = await provider.request<any>(
    'GET',
    `/channels/${channelId}/messages/${messageId}`
  );

  return DiscordMessageSchema.parse({
    id: message.id,
    channelId: message.channel_id,
    content: message.content,
    createdAt: message.timestamp,
    author: {
      id: message.author.id,
      username: message.author.username,
      globalName: message.author.global_name ?? null,
      bot: message.author.bot ?? false,
    },
    reactions: (message.reactions ?? []).map((reaction: any) => ({
      emoji: reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name,
      count: reaction.count,
    })),
  });
}

export async function listMessageReactionUsersAPI(
  provider: DiscordProvider,
  channelId: string,
  messageId: string,
  emoji: string
): Promise<DiscordReactionUser[]> {
  const users = await provider.request<any[]>(
    'GET',
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}?limit=100`
  );

  return users.map((user) =>
    DiscordReactionUserSchema.parse({
      id: user.id,
      username: user.username,
      globalName: user.global_name ?? null,
      bot: user.bot ?? false,
    })
  );
}
