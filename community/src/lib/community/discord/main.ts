import type { CommunityProvider } from '../interface';
import type { CommunityMembership, CommunityMessage, CommunityReactionUser, CommunityRole, SendMessageInput, SendMessageResult } from '../type';
import { CommunityProviderError } from '../error';
import { getGuildMembershipAPI, listUserRolesAPI } from './role';
import { getMessageAPI, listMessageReactionUsersAPI, sendMessageAPI } from './message';

export class DiscordProvider implements CommunityProvider {
  private readonly API_BASE = 'https://discord.com/api/v10';

  constructor(
    public readonly token: string,
    public readonly guildId: string
  ) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CommunityProviderError('Discord API Error', response.status, 'discord', errorData);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async listUserRoles(userId: string): Promise<CommunityRole[]> {
    return listUserRolesAPI(this, userId);
  }

  async getGuildMembership(userId: string): Promise<CommunityMembership> {
    return getGuildMembershipAPI(this, userId);
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    return sendMessageAPI(this, input);
  }

  async getMessage(channelId: string, messageId: string): Promise<CommunityMessage> {
    return getMessageAPI(this, channelId, messageId);
  }

  async listMessageReactionUsers(channelId: string, messageId: string, emoji: string): Promise<CommunityReactionUser[]> {
    return listMessageReactionUsersAPI(this, channelId, messageId, emoji);
  }
}
