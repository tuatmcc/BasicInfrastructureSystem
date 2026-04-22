import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { reactionResponse } from "../../../../responses";
import {
  bearerSecurity,
  commonErrorResponses,
  getServices,
  jsonContent,
  reactionTotallingQuerySchema,
  ReactionSchema,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../../shared";

export function registerTotallingMessageReactionRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/message/reaction/totalling",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: reactionTotallingQuerySchema,
      },
      responses: {
        200: jsonContent(z.array(ReactionSchema), "Reaction totals"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const reactions = await getServices(c.env).messageService.totalReactions(
        query.channel_id,
        query.message_id,
      );
      return c.json(reactions.map(reactionResponse), 200);
    },
  );
}
