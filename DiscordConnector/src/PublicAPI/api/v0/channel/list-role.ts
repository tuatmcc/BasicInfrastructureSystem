import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { roleResponse } from "../../../responses";
import {
  bearerSecurity,
  channelIdQuerySchema,
  commonErrorResponses,
  getServices,
  jsonContent,
  requireRoleMiddleware,
  RoleSchema,
  type AppEnv,
} from "../../../shared";

export function registerListChannelRoleRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/channel/list-role",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: channelIdQuerySchema,
      },
      responses: {
        200: jsonContent(z.array(RoleSchema), "Channel role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const roles = await getServices(c.env).channelService.listChannelRoles(query.channel_id);
      return c.json(roles.map(roleResponse), 200);
    },
  );
}
