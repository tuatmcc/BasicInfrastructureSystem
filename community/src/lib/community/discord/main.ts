import type { CommunityProvider } from '../interface';
import type { Role, SendMessageInput, SendMessageResult } from '../type';
import { listUserRolesAPI } from './role';
import { sendMessageAPI } from './message';

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
      throw new Error(`Discord API Error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async listUserRoles(userId: string): Promise<Role[]> {
    return listUserRolesAPI(this, userId);
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    return sendMessageAPI(this, input);
  }
}
