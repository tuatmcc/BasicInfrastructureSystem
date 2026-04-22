import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { roleResponse } from "../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  createRoleBodySchema,
  getServices,
  jsonBody,
  jsonContent,
  requireRoleMiddleware,
  RoleSchema,
  type AppEnv,
} from "../../../shared";

export function registerCreateRoleRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/role/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(createRoleBodySchema, "Role creation payload"),
      },
      responses: {
        200: jsonContent(RoleSchema, "Created role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const role = await getServices(c.env).roleService.createRole(
        body.name,
        body.color ?? null,
        body.position ?? null,
      );
      return c.json(roleResponse(role), 200);
    },
  );
}
