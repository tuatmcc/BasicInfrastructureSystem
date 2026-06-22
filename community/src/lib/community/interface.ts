import { z } from 'zod';
import { Role, SendMessageInput, SendMessageResult } from './type';

// --- Interface Definition ---

export interface CommunityProvider {


// role
  listUserRoles(userId: string): Promise<Role[]>;

// message
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
