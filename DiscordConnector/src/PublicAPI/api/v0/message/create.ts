import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { messageResponse } from "../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  createMessageBodySchema,
  getServices,
  jsonBody,
  jsonContent,
  MessageSchema,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

export function registerCreateMessageRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/message/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("operator"),
      request: {
        body: jsonBody(createMessageBodySchema, "Message creation payload"),
      },
      responses: {
        200: jsonContent(MessageSchema, "Created message"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const message = await getServices(c.env).messageService.createMessage(
        body.channel_id,
        body.content,
      );
      return c.json(messageResponse(message), 200);
    },
  );
}
