import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { channelResponse } from "../../../responses";
import {
  bearerSecurity,
  ChannelSchema,
  commonErrorResponses,
  getServices,
  jsonContent,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

export function registerListChannelRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/channel/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(ChannelSchema), "Channel list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const channels = await getServices(c.env).channelService.listChannels();
      return c.json(channels.map(channelResponse), 200);
    },
  );
}
