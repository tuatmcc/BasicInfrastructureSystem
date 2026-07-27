import {
  CommunityMembership,
  CommunityMessage,
  CommunityReactionUser,
  CommunityRole,
  SendMessageInput,
  SendMessageResult
} from './type';

// --- Interface Definition ---

// The port every community provider implements. It speaks only the neutral
// types from ./type, so replacing the Discord adapter does not reach into the
// callers that depend on this interface.
export interface CommunityProvider {


// role
  listUserRoles(userId: string): Promise<CommunityRole[]>;
  getGuildMembership(userId: string): Promise<CommunityMembership>;

// message
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  getMessage(channelId: string, messageId: string): Promise<CommunityMessage>;
  listMessageReactionUsers(channelId: string, messageId: string, emoji: string): Promise<CommunityReactionUser[]>;
}
