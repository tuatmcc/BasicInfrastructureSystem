import type { IDiscordController } from "../../DiscordController";
import type { IDiscordDatabaseController } from "../../DiscordDatabaseController";
import type { MemberData, RgbColor, RoleData, Snowflake } from "../../types";

export class RoleService {
  constructor(
    private readonly controller: IDiscordController,
    private readonly dbController: IDiscordDatabaseController,
  ) {}

  async createRole(name: string, color: RgbColor | null = null, position: number | null = null): Promise<RoleData> {
    const role = await this.controller.createRole(name, color, position);
    try {
      await this.dbController.createRole(role.id, role.name, role.permissions ?? 0);
    } catch (error) {
      console.error("Failed to save role to database", error);
    }
    return role;
  }

  async deleteRole(roleId: Snowflake): Promise<boolean> {
    const success = await this.controller.deleteRole(roleId);
    if (success) {
      try {
        await this.dbController.deleteRole(roleId);
      } catch (error) {
        console.error("Failed to delete role from database", error);
      }
    }
    return success;
  }

  async listRoles(): Promise<RoleData[]> {
    return this.controller.listRoles();
  }

  async listRoleMembers(roleId: Snowflake): Promise<MemberData[]> {
    return this.controller.listRoleMembers(roleId);
  }
}
