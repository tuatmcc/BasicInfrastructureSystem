import type { DiscordProvider } from './main';
import { CommunityProviderError } from '../error';
import type {
  CommunityMessage,
  CommunityReactionUser,
  SendMessageInput,
  SendMessageResult
} from '../type';
import { SendMessageResultSchema } from '../type';
import {
  DISCORD_MESSAGE_CONTENT_LIMIT,
  DiscordMessageSchema,
  DiscordReactionUserSchema,
  DiscordSendMessageInputSchema
} from './schema';

// チャンネルへメッセージを送信し、送信したメッセージIDを返す
export async function sendMessageAPI(
  provider: DiscordProvider,
  input: SendMessageInput
): Promise<SendMessageResult> {
  const parsedInput = DiscordSendMessageInputSchema.parse(input);
  const roleIds = parsedInput.mentionRoleIds ?? [];

  // メンション対象のロールをメッセージ本文に埋め込む（<@&ロールID>）
  const mentions = roleIds.map((id) => `<@&${id}>`).join(' ');
  const content = mentions ? `${mentions} ${parsedInput.content}` : parsedInput.content;

  if (content.length > DISCORD_MESSAGE_CONTENT_LIMIT) {
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
): Promise<CommunityMessage> {
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
      displayName: message.author.global_name ?? null,
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
): Promise<CommunityReactionUser[]> {
  const users: CommunityReactionUser[] = [];
  let after: string | undefined;

  while (true) {
    const query = new URLSearchParams({ limit: '100' });
    if (after) query.set('after', after);

    const page = await provider.request<any[]>(
      'GET',
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}?${query.toString()}`
    );

    const parsedPage = page.map((user) =>
      DiscordReactionUserSchema.parse({
        id: user.id,
        username: user.username,
        displayName: user.global_name ?? null,
        bot: user.bot ?? false,
      })
    );
    users.push(...parsedPage.filter((user) => !user.bot));

    if (page.length < 100) break;
    const nextAfter = parsedPage.at(-1)?.id;
    if (!nextAfter || nextAfter === after) break;
    after = nextAfter;
  }

  return users;
}
