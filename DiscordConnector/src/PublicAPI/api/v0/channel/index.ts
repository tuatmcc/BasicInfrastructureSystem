import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../../shared";
import { registerCreateChannelRoute } from "./create";
import { registerDeleteChannelRoute } from "./delete";
import { registerListChannelRoute } from "./list";
import { registerListChannelRoleRoute } from "./list-role";

export function registerChannelRoutes(app: OpenAPIHono<AppEnv>): void {
  registerCreateChannelRoute(app);
  registerDeleteChannelRoute(app);
  registerListChannelRoute(app);
  registerListChannelRoleRoute(app);
}
