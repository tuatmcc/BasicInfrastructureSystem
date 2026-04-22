import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../../shared";
import { registerBanMemberRoute } from "./ban";
import { registerListMemberRoute } from "./list";
import { registerListMemberRolesRoute } from "./list-roles";
import { registerTimeoutMemberRoute } from "./timeout";

export function registerMemberRoutes(app: OpenAPIHono<AppEnv>): void {
  registerListMemberRoute(app);
  registerBanMemberRoute(app);
  registerTimeoutMemberRoute(app);
  registerListMemberRolesRoute(app);
}
