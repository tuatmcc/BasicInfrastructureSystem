import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  categoryResponse,
  channelResponse,
  memberResponse,
  messageResponse,
  reactionResponse,
  roleResponse,
} from "../../../responses";
import {
  bearerSecurity,
  CategorySchema,
  ChannelSchema,
  channelIdQuerySchema,
  commonErrorResponses,
  createCategoryBodySchema,
  createChannelBodySchema,
  createMessageBodySchema,
  createRoleBodySchema,
  deleteMessageBodySchema,
  getServices,
  idBodySchema,
  jsonBody,
  jsonContent,
  MemberSchema,
  memberIdQuerySchema,
  MessageSchema,
  reactionTotallingQuerySchema,
  ReactionSchema,
  requireRoleMiddleware,
  RoleSchema,
  roleIdQuerySchema,
  SuccessSchema,
  type AppEnv,
} from "../../../shared";

export function registerDiscordRoutes(app: OpenAPIHono<AppEnv>): void {
  registerRoleRoutes(app);
  registerChannelRoutes(app);
  registerCategoryRoutes(app);
  registerMemberRoutes(app);
  registerMessageRoutes(app);
}

function registerRoleRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/role/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(RoleSchema), "Discord role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const roles = await getServices(c.env).discordController.listRoles();
      return c.json(roles.map(roleResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/role/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(createRoleBodySchema, "Discord role creation payload") },
      responses: {
        200: jsonContent(RoleSchema, "Created Discord role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const role = await getServices(c.env).discordController.createRole(
        body.name,
        body.color ?? null,
        body.position ?? null,
      );
      return c.json(roleResponse(role), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/role/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(idBodySchema, "Discord role deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "Discord role deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).discordController.deleteRole(body.id);
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/role/list-members",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: roleIdQuerySchema },
      responses: {
        200: jsonContent(z.array(MemberSchema), "Discord role member list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { role_id: roleId } = c.req.valid("query");
      const members = await getServices(c.env).discordController.listRoleMembers(roleId);
      return c.json(members.map(memberResponse), 200);
    },
  );
}

function registerChannelRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/channel/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(ChannelSchema), "Discord channel list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const channels = await getServices(c.env).discordController.listChannels();
      return c.json(channels.map(channelResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/channel/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(createChannelBodySchema, "Discord channel creation payload") },
      responses: {
        200: jsonContent(ChannelSchema, "Created Discord channel"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const channel = await getServices(c.env).discordController.createChannel(
        body.name,
        body.category_id ?? null,
        body.position ?? null,
      );
      return c.json(channelResponse(channel), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/channel/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(idBodySchema, "Discord channel deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "Discord channel deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).discordController.deleteChannel(body.id);
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/channel/list-role",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: channelIdQuerySchema },
      responses: {
        200: jsonContent(z.array(RoleSchema), "Discord channel role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { channel_id: channelId } = c.req.valid("query");
      const roles = await getServices(c.env).discordController.listChannelRoles(channelId);
      return c.json(roles.map(roleResponse), 200);
    },
  );
}

function registerCategoryRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/category/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(CategorySchema), "Discord category list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const categories = await getServices(c.env).discordController.listCategories();
      return c.json(categories.map(categoryResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/category/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(createCategoryBodySchema, "Discord category creation payload") },
      responses: {
        200: jsonContent(CategorySchema, "Created Discord category"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const category = await getServices(c.env).discordController.createCategory(
        body.name,
        body.position ?? null,
      );
      return c.json(categoryResponse(category), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/category/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(idBodySchema, "Discord category deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "Discord category deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).discordController.deleteCategory(body.id);
      return c.json({ success }, 200);
    },
  );
}

function registerMemberRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/member/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(MemberSchema), "Discord member list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const members = await getServices(c.env).discordController.listMembers();
      return c.json(members.map(memberResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/member/list-roles",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: memberIdQuerySchema },
      responses: {
        200: jsonContent(z.array(RoleSchema), "Discord member role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { member_id: memberId } = c.req.valid("query");
      const roles = await getServices(c.env).discordController.listMemberRoles(memberId);
      return c.json(roles.map(roleResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/member/ban",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(idBodySchema, "Discord member ban payload") },
      responses: {
        200: jsonContent(SuccessSchema, "Discord member ban result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).discordController.banMember(body.id);
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/member/timeout",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(idBodySchema, "Discord member timeout payload") },
      responses: {
        200: jsonContent(SuccessSchema, "Discord member timeout result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).discordController.kickMember(body.id);
      return c.json({ success }, 200);
    },
  );
}

function registerMessageRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/message/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("operator"),
      request: { body: jsonBody(createMessageBodySchema, "Discord message creation payload") },
      responses: {
        200: jsonContent(MessageSchema, "Created Discord message"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const message = await getServices(c.env).discordController.createMessage(
        body.channel_id,
        body.content,
      );
      return c.json(messageResponse(message), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/discord/message/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("operator"),
      request: { body: jsonBody(deleteMessageBodySchema, "Discord message deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "Discord message deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).discordController.deleteMessage(
        body.channel_id,
        body.message_id,
      );
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/discord/message/reaction/totalling",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: reactionTotallingQuerySchema },
      responses: {
        200: jsonContent(z.array(ReactionSchema), "Discord message reaction totals"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { channel_id: channelId, message_id: messageId } = c.req.valid("query");
      const reactions = await getServices(c.env).discordController.totalReactions(channelId, messageId);
      return c.json(reactions.map(reactionResponse), 200);
    },
  );
}
