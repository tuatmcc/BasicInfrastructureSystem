import type { DiscordProvider } from './main';
import { CommunityProviderError } from '../error';
import { SendMessageInput, SendMessageInputSchema, SendMessageResult, SendMessageResultSchema } from '../type';

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
