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

export function registerDeleteChannelRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/channel/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(idBodySchema, "Channel deletion payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Channel deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).channelService.deleteChannel(body.id);
      return c.json({ success }, 200);
    },
  );
}
