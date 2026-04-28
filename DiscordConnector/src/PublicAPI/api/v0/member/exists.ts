import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  jsonContent,
  memberIdQuerySchema,
  SnowflakeSchema,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

const MemberExistsSchema = z
  .object({
    member_id: SnowflakeSchema,
    exists: z.boolean(),
  })
  .openapi("MemberExists");

export function registerMemberExistsRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/member/exists",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: memberIdQuerySchema,
      },
      responses: {
        200: jsonContent(MemberExistsSchema, "Whether the member belongs to the guild"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { member_id: memberId } = c.req.valid("query");
      const exists = (await getServices(c.env).memberService.listMembers())
        .some((member) => member.id === memberId);

      return c.json({
        member_id: memberId,
        exists,
      }, 200);
    },
  );
}
