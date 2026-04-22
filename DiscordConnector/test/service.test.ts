import { MockDiscordController } from "../src/DiscordController";
import { MemoryDiscordDatabaseController } from "../src/DiscordDatabaseController";
import { CategoryService, ChannelService, RoleService } from "../src/ControlInterface";

describe("ControlInterface services", () => {
  it("persists created roles to the database controller", async () => {
    const discord = new MockDiscordController();
    const db = new MemoryDiscordDatabaseController();
    const service = new RoleService(discord, db);

    const role = await service.createRole("TestRole", [255, 100, 50], 5);

    expect(await db.getRole(role.id)).toMatchObject({
      roleId: role.id,
      roleName: "TestRole",
      permissions: 0,
    });
  });

  it("persists created categories and channels", async () => {
    const discord = new MockDiscordController();
    const db = new MemoryDiscordDatabaseController();
    const categoryService = new CategoryService(discord, db);
    const channelService = new ChannelService(discord, db);

    const category = await categoryService.createCategory("Test Category");
    const channel = await channelService.createChannel("test-channel", category.id);

    expect(await db.getCategory(category.id)).toMatchObject({ categoryName: "Test Category" });
    expect(await db.getChannel(channel.id)).toMatchObject({
      channelName: "test-channel",
      categoryId: category.id,
    });
  });
});
