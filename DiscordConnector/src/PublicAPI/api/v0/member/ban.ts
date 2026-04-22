import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  idBodySchema,
  jsonBody,
  jsonContent,
  requireRoleMiddleware,
  SuccessSchema,
  type AppEnv,
} from "../../../shared";

export function registerBanMemberRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/member/ban",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(idBodySchema, "Member ban payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Member ban result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).memberService.banMember(body.id);
      return c.json({ success }, 200);
    },
  );
}
