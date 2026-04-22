import type { IDiscordController } from "../../DiscordController";
import type { IDiscordDatabaseController } from "../../DiscordDatabaseController";
import type { MemberData, RoleData, Snowflake } from "../../types";

export class MemberService {
  constructor(
    private readonly controller: IDiscordController,
    private readonly dbController: IDiscordDatabaseController,
  ) {}

  async listMembers(): Promise<MemberData[]> {
    return this.controller.listMembers();
  }

  async banMember(memberId: Snowflake): Promise<boolean> {
    const success = await this.controller.banMember(memberId);
    if (success) {
      try {
        await this.dbController.deleteUser(memberId);
      } catch (error) {
        console.error("Failed to delete user from database", error);
      }
    }
    return success;
  }

  async timeoutMember(memberId: Snowflake): Promise<boolean> {
    return this.controller.kickMember(memberId);
  }

  async listMemberRoles(memberId: Snowflake): Promise<RoleData[]> {
    return this.controller.listMemberRoles(memberId);
  }
}
