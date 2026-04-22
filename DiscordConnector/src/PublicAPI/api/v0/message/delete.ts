import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import {
  bearerSecurity,
  commonErrorResponses,
  deleteMessageBodySchema,
  getServices,
  jsonBody,
  jsonContent,
  requireRoleMiddleware,
  SuccessSchema,
  type AppEnv,
} from "../../../shared";

export function registerDeleteMessageRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/message/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("operator"),
      request: {
        body: jsonBody(deleteMessageBodySchema, "Message deletion payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Message deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).messageService.deleteMessage(
        body.channel_id,
        body.message_id,
      );
      return c.json({ success }, 200);
    },
  );
}
