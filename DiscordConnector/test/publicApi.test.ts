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

  it("serves Swagger UI without authorization", async () => {
    const response = await createApp().request("/docs", {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("/openapi.json");
  });

  it("serves generated OpenAPI JSON without authorization", async () => {
    const response = await createApp().request("/openapi.json", {}, env);
    expect(response.status).toBe(200);
    const document = await response.json() as {
      paths: Record<string, unknown>;
      components: {
        securitySchemes: Record<string, unknown>;
      };
    };
    expect(document).toMatchObject({
      openapi: "3.0.0",
      info: {
        title: "DiscordConnector API",
        version: "0.1.0",
      },
    });
    expect(document.paths["/api/v0/role/list"]).toBeDefined();
    expect(document.components.securitySchemes.BearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });
});
