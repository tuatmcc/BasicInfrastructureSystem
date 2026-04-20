import { createApp } from "../src/PublicAPI/app";

const env = {
  MOCK_MODE: "true",
  SUPABASE_PROJECT_URL: "https://example.supabase.co",
  HYPERDRIVE: { connectionString: "postgres://example" } as Hyperdrive,
} satisfies Env;

describe("PublicAPI", () => {
  it("keeps health public", async () => {
    const response = await createApp().request("/health", {}, env);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("requires authorization on protected endpoints", async () => {
    const response = await createApp().request("/api/v0/role/list", {}, env);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    await expect(response.json()).resolves.toEqual({ detail: "Authorization header is required" });
  });
});
