import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { channelResponse } from "../../../responses";
import {
  bearerSecurity,
  ChannelSchema,
  commonErrorResponses,
  createChannelBodySchema,
  getServices,
  jsonBody,
  jsonContent,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

export function registerCreateChannelRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/channel/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(createChannelBodySchema, "Channel creation payload"),
      },
      responses: {
        200: jsonContent(ChannelSchema, "Created channel"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const channel = await getServices(c.env).channelService.createChannel(
        body.name,
        body.category_id ?? null,
        body.position ?? null,
      );
      return c.json(channelResponse(channel), 200);
    },
  );
}
