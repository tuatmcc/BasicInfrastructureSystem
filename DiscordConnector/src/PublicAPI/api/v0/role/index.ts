import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../../shared";
import { registerCreateRoleRoute } from "./create";
import { registerDeleteRoleRoute } from "./delete";
import { registerListRoleRoute } from "./list";
import { registerListRoleMembersRoute } from "./list-members";

export function registerRoleRoutes(app: OpenAPIHono<AppEnv>): void {
  registerCreateRoleRoute(app);
  registerDeleteRoleRoute(app);
  registerListRoleRoute(app);
  registerListRoleMembersRoute(app);
}
