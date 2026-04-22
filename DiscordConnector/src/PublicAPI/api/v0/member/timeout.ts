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

export function registerTimeoutMemberRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/member/timeout",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(idBodySchema, "Member timeout payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Member timeout result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).memberService.timeoutMember(body.id);
      return c.json({ success }, 200);
    },
  );
}
