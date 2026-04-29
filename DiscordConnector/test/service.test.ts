import { MockDiscordController } from "../src/DiscordController";
import { DiscordLoggingDatabaseController, MemoryDiscordDatabaseController } from "../src/DiscordDatabaseController";
import { CategoryService, ChannelService, createDbController, createServices, RoleService } from "../src/ControlInterface";

const envWithDbLogging = {
  MOCK_MODE: "true",
  DISCORD_LOG_CHANNEL_ID: "123456789012345678",
  SUPABASE_PROJECT_URL: "https://example.supabase.co",
  HYPERDRIVE: { connectionString: "postgres://example" } as Hyperdrive,
} satisfies Env;

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

  it("keeps the db-only controller free of Discord logging side effects", () => {
    const discord = new MockDiscordController();
    const loggedDb = createDbController(envWithDbLogging, discord);
    const services = createServices(envWithDbLogging);

    expect(loggedDb).toBeInstanceOf(DiscordLoggingDatabaseController);
    expect(services.dbOnlyController).toBeInstanceOf(MemoryDiscordDatabaseController);
    expect(services.dbOnlyController).not.toBeInstanceOf(DiscordLoggingDatabaseController);
  });
});
