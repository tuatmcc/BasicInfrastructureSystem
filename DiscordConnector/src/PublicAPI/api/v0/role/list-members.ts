import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { memberResponse } from "../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  jsonContent,
  MemberSchema,
  requireRoleMiddleware,
  roleIdQuerySchema,
  type AppEnv,
} from "../../../shared";

export function registerListRoleMembersRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/role/list-members",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: roleIdQuerySchema,
      },
      responses: {
        200: jsonContent(z.array(MemberSchema), "Members with role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const members = await getServices(c.env).roleService.listRoleMembers(query.role_id);
      return c.json(members.map(memberResponse), 200);
    },
  );
}
