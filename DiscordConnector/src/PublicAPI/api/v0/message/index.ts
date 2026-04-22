import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../../shared";
import { registerCreateMessageRoute } from "./create";
import { registerDeleteMessageRoute } from "./delete";
import { registerMessageReactionRoutes } from "./reaction";

export function registerMessageRoutes(app: OpenAPIHono<AppEnv>): void {
  registerCreateMessageRoute(app);
  registerDeleteMessageRoute(app);
  registerMessageReactionRoutes(app);
}
