import type { IDiscordController } from "../../DiscordController";
import type { IDiscordDatabaseController } from "../../DiscordDatabaseController";
import type { ChannelData, RoleData, Snowflake } from "../../types";

export class ChannelService {
  constructor(
    private readonly controller: IDiscordController,
    private readonly dbController: IDiscordDatabaseController,
  ) {}

  async createChannel(name: string, categoryId: Snowflake | null = null, position: number | null = null): Promise<ChannelData> {
    const channel = await this.controller.createChannel(name, categoryId, position);
    if (channel.categoryId !== null) {
      try {
        await this.dbController.createChannel(channel.id, channel.name, channel.categoryId);
      } catch (error) {
        console.error("Failed to save channel to database", error);
      }
    }
    return channel;
  }

  async deleteChannel(channelId: Snowflake): Promise<boolean> {
    const success = await this.controller.deleteChannel(channelId);
    if (success) {
      try {
        await this.dbController.deleteChannel(channelId);
      } catch (error) {
        console.error("Failed to delete channel from database", error);
      }
    }
    return success;
  }

  async listChannels(): Promise<ChannelData[]> {
    return this.controller.listChannels();
  }

  async listChannelRoles(channelId: Snowflake): Promise<RoleData[]> {
    return this.controller.listChannelRoles(channelId);
  }
}
