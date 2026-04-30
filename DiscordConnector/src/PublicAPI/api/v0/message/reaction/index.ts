import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../../../shared";
import { registerTotallingMessageReactionRoute } from "./totalling";

export function registerMessageReactionRoutes(app: OpenAPIHono<AppEnv>): void {
  registerTotallingMessageReactionRoute(app);
}
