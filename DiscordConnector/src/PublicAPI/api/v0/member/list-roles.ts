import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { roleResponse } from "../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  jsonContent,
  memberIdQuerySchema,
  requireRoleMiddleware,
  RoleSchema,
  type AppEnv,
} from "../../../shared";

export function registerListMemberRolesRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/member/list-roles",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: memberIdQuerySchema,
      },
      responses: {
        200: jsonContent(z.array(RoleSchema), "Member role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const roles = await getServices(c.env).memberService.listMemberRoles(query.member_id);
      return c.json(roles.map(roleResponse), 200);
    },
  );
}
