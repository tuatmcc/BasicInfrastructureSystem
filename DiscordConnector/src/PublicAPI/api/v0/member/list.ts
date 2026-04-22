import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { memberResponse } from "../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  jsonContent,
  MemberSchema,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

export function registerListMemberRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/member/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(MemberSchema), "Member list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const members = await getServices(c.env).memberService.listMembers();
      return c.json(members.map(memberResponse), 200);
    },
  );
}
