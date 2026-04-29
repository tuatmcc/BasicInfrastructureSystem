import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { NotFoundError } from "../../../../errors";
import {
  dbCategoryResponse,
  dbChannelResponse,
  dbRoleResponse,
  dbUserResponse,
} from "../../../responses";
import {
  bearerSecurity,
  categoryIdQuerySchema,
  channelIdQuerySchema,
  commonErrorResponses,
  DbCategorySchema,
  DbChannelSchema,
  DbRoleSchema,
  DbUserSchema,
  dbCategoryBodySchema,
  dbCategoryDeleteBodySchema,
  dbCategorySyncPermissionsBodySchema,
  dbChannelBodySchema,
  dbChannelDeleteBodySchema,
  dbChannelSyncPermissionsBodySchema,
  dbRoleBodySchema,
  dbRoleDeleteBodySchema,
  dbRoleUpdateBodySchema,
  dbUserBodySchema,
  dbUserDeleteBodySchema,
  dbUserSyncRolesBodySchema,
  discordUserIdQuerySchema,
  getServices,
  jsonBody,
  jsonContent,
  optionalMemberIdQuerySchema,
  requireRoleMiddleware,
  roleIdQuerySchema,
  SuccessSchema,
  type AppEnv,
} from "../../../shared";

const SyncCountSchema = z
  .object({
    count: z.number().int(),
  })
  .openapi("SyncCount");

export function registerDbRoutes(app: OpenAPIHono<AppEnv>): void {
  registerUserRoutes(app);
  registerRoleRoutes(app);
  registerCategoryRoutes(app);
  registerChannelRoutes(app);
}

function registerUserRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/user/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: optionalMemberIdQuerySchema },
      responses: {
        200: jsonContent(z.array(DbUserSchema), "DB user list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const users = await getServices(c.env).dbOnlyController.getUsers(query.member_id ?? null);
      return c.json(users.map(dbUserResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/user/get",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: discordUserIdQuerySchema },
      responses: {
        200: jsonContent(DbUserSchema, "DB user"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { discord_user_id: discordUserId } = c.req.valid("query");
      const user = await getServices(c.env).dbOnlyController.getUser(discordUserId);
      if (user === null) {
        throw new NotFoundError(`User ${discordUserId} not found`);
      }
      return c.json(dbUserResponse(user), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/user/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbUserBodySchema, "DB user creation payload") },
      responses: {
        200: jsonContent(DbUserSchema, "Created DB user"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const user = await getServices(c.env).dbOnlyController.createUser(
        body.discord_user_id,
        body.display_name,
        body.member_id ?? null,
      );
      return c.json(dbUserResponse(user), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/user/update",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbUserBodySchema, "DB user update payload") },
      responses: {
        200: jsonContent(DbUserSchema, "Updated DB user"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const user = await getServices(c.env).dbOnlyController.updateUser(
        body.discord_user_id,
        body.display_name,
        body.member_id ?? null,
      );
      if (user === null) {
        throw new NotFoundError(`User ${body.discord_user_id} not found`);
      }
      return c.json(dbUserResponse(user), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/user/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbUserDeleteBodySchema, "DB user deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "DB user deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).dbOnlyController.deleteUser(body.discord_user_id);
      if (!success) {
        throw new NotFoundError(`User ${body.discord_user_id} not found`);
      }
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/user/sync-roles",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbUserSyncRolesBodySchema, "DB user role sync payload") },
      responses: {
        200: jsonContent(SyncCountSchema, "Synced DB user role count"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const count = await getServices(c.env).dbOnlyController.syncUserRoles(
        body.discord_user_id,
        body.role_ids,
      );
      return c.json({ count }, 200);
    },
  );
}

function registerRoleRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/role/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(DbRoleSchema), "DB role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const roles = await getServices(c.env).dbOnlyController.getRoles();
      return c.json(roles.map(dbRoleResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/role/get",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: roleIdQuerySchema },
      responses: {
        200: jsonContent(DbRoleSchema, "DB role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { role_id: roleId } = c.req.valid("query");
      const role = await getServices(c.env).dbOnlyController.getRole(roleId);
      if (role === null) {
        throw new NotFoundError(`Role ${roleId} not found`);
      }
      return c.json(dbRoleResponse(role), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/role/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbRoleBodySchema, "DB role creation payload") },
      responses: {
        200: jsonContent(DbRoleSchema, "Created DB role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const role = await getServices(c.env).dbOnlyController.createRole(
        body.role_id,
        body.role_name,
        body.permissions,
      );
      return c.json(dbRoleResponse(role), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/role/update",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbRoleUpdateBodySchema, "DB role update payload") },
      responses: {
        200: jsonContent(DbRoleSchema, "Updated DB role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const role = await getServices(c.env).dbOnlyController.updateRole(
        body.role_id,
        body.role_name ?? null,
        body.permissions ?? null,
      );
      if (role === null) {
        throw new NotFoundError(`Role ${body.role_id} not found`);
      }
      return c.json(dbRoleResponse(role), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/role/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbRoleDeleteBodySchema, "DB role deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "DB role deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).dbOnlyController.deleteRole(body.role_id);
      if (!success) {
        throw new NotFoundError(`Role ${body.role_id} not found`);
      }
      return c.json({ success }, 200);
    },
  );
}

function registerCategoryRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/category/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(DbCategorySchema), "DB category list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const categories = await getServices(c.env).dbOnlyController.getCategories();
      return c.json(categories.map(dbCategoryResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/category/get",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: categoryIdQuerySchema },
      responses: {
        200: jsonContent(DbCategorySchema, "DB category"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { category_id: categoryId } = c.req.valid("query");
      const category = await getServices(c.env).dbOnlyController.getCategory(categoryId);
      if (category === null) {
        throw new NotFoundError(`Category ${categoryId} not found`);
      }
      return c.json(dbCategoryResponse(category), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/category/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbCategoryBodySchema, "DB category creation payload") },
      responses: {
        200: jsonContent(DbCategorySchema, "Created DB category"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const category = await getServices(c.env).dbOnlyController.createCategory(
        body.category_id,
        body.category_name,
      );
      return c.json(dbCategoryResponse(category), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/category/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbCategoryDeleteBodySchema, "DB category deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "DB category deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).dbOnlyController.deleteCategory(body.category_id);
      if (!success) {
        throw new NotFoundError(`Category ${body.category_id} not found`);
      }
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/category/sync-permissions",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbCategorySyncPermissionsBodySchema, "DB category permission sync payload") },
      responses: {
        200: jsonContent(SyncCountSchema, "Synced DB category permission count"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const count = await getServices(c.env).dbOnlyController.syncCategoryPermissions(
        body.category_id,
        body.role_ids,
      );
      return c.json({ count }, 200);
    },
  );
}

function registerChannelRoutes(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/channel/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(DbChannelSchema), "DB channel list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const channels = await getServices(c.env).dbOnlyController.getChannels();
      return c.json(channels.map(dbChannelResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/db/channel/get",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: { query: channelIdQuerySchema },
      responses: {
        200: jsonContent(DbChannelSchema, "DB channel"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const { channel_id: channelId } = c.req.valid("query");
      const channel = await getServices(c.env).dbOnlyController.getChannel(channelId);
      if (channel === null) {
        throw new NotFoundError(`Channel ${channelId} not found`);
      }
      return c.json(dbChannelResponse(channel), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/channel/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbChannelBodySchema, "DB channel creation payload") },
      responses: {
        200: jsonContent(DbChannelSchema, "Created DB channel"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const channel = await getServices(c.env).dbOnlyController.createChannel(
        body.channel_id,
        body.channel_name,
        body.category_id,
        body.role_ids ?? null,
      );
      return c.json(dbChannelResponse(channel), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/channel/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbChannelDeleteBodySchema, "DB channel deletion payload") },
      responses: {
        200: jsonContent(SuccessSchema, "DB channel deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).dbOnlyController.deleteChannel(body.channel_id);
      if (!success) {
        throw new NotFoundError(`Channel ${body.channel_id} not found`);
      }
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/db/channel/sync-permissions",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: { body: jsonBody(dbChannelSyncPermissionsBodySchema, "DB channel permission sync payload") },
      responses: {
        200: jsonContent(SyncCountSchema, "Synced DB channel permission count"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const count = await getServices(c.env).dbOnlyController.syncChannelPermissions(
        body.channel_id,
        body.role_ids,
      );
      return c.json({ count }, 200);
    },
  );
}
