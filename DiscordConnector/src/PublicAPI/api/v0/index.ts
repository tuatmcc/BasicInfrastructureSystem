import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../shared";
import { registerCategoryRoutes } from "./category";
import { registerChannelRoutes } from "./channel";
import { registerDbRoutes } from "./db";
import { registerDiscordRoutes } from "./discord";
import { registerMemberRoutes } from "./member";
import { registerMessageRoutes } from "./message";
import { registerRoleRoutes } from "./role";

export function registerV0Routes(app: OpenAPIHono<AppEnv>): void {
  registerRoleRoutes(app);
  registerChannelRoutes(app);
  registerCategoryRoutes(app);
  registerMemberRoutes(app);
  registerMessageRoutes(app);
  registerDbRoutes(app);
  registerDiscordRoutes(app);
}
