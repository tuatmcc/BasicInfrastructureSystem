import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { roleResponse } from "../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  jsonContent,
  requireRoleMiddleware,
  RoleSchema,
  type AppEnv,
} from "../../../shared";

export function registerListRoleRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/role/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(RoleSchema), "Role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const roles = await getServices(c.env).roleService.listRoles();
      return c.json(roles.map(roleResponse), 200);
    },
  );
}
