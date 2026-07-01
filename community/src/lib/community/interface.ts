import { z } from 'zod';
import {
  DiscordMessage,
  DiscordReactionUser,
  Role,
  SendMessageInput,
  SendMessageResult
} from './type';

// --- Interface Definition ---

export interface CommunityProvider {


// role
  listUserRoles(userId: string): Promise<Role[]>;

// message
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  getMessage(channelId: string, messageId: string): Promise<DiscordMessage>;
  listMessageReactionUsers(channelId: string, messageId: string, emoji: string): Promise<DiscordReactionUser[]>;
}
