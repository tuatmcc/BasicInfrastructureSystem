import { afterEach, vi } from "vitest";
import { DiscordRestController } from "../src/DiscordController";

const env = {
  DISCORD_BOT_TOKEN: "bot-token",
  DISCORD_GUILD_ID: "123",
  HYPERDRIVE: { connectionString: "postgres://example" } as Hyperdrive,
} satisfies Env;

describe("DiscordRestController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates roles through the Discord REST API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        id: "456",
        name: "NewRole",
        color: 16711680,
        position: 3,
        permissions: "8",
      })),
    );

    const role = await new DiscordRestController(env).createRole("NewRole", [255, 0, 0]);

    expect(role).toEqual({
      id: "456",
      name: "NewRole",
      color: [255, 0, 0],
      position: 3,
      permissions: 8,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/v10/guilds/123/roles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "NewRole", color: 16711680 }),
      }),
    );
  });
});
