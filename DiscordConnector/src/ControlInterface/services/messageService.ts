import type { IDiscordController } from "../../DiscordController";
import type { MessageData, ReactionData, Snowflake } from "../../types";

export class MessageService {
  constructor(private readonly controller: IDiscordController) {}

  async createMessage(channelId: Snowflake, content: string): Promise<MessageData> {
    return this.controller.createMessage(channelId, content);
  }

  async deleteMessage(channelId: Snowflake, messageId: Snowflake): Promise<boolean> {
    return this.controller.deleteMessage(channelId, messageId);
  }

  async totalReactions(channelId: Snowflake, messageId: Snowflake): Promise<ReactionData[]> {
    return this.controller.totalReactions(channelId, messageId);
  }
}
