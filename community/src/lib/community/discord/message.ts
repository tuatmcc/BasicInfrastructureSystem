import type { DiscordProvider } from './main';
import { SendMessageInput, SendMessageResult, SendMessageResultSchema } from '../type';

// チャンネルへメッセージを送信し、送信したメッセージIDを返す
export async function sendMessageAPI(
  provider: DiscordProvider,
  input: SendMessageInput
): Promise<SendMessageResult> {
  const roleIds = input.mentionRoleIds ?? [];

  // メンション対象のロールをメッセージ本文に埋め込む（<@&ロールID>）
  const mentions = roleIds.map((id) => `<@&${id}>`).join(' ');
  const content = mentions ? `${mentions} ${input.content}` : input.content;

  const message = await provider.request<any>(
    'POST',
    `/channels/${input.channelId}/messages`,
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
