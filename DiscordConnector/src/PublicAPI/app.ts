import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { createServices, type Services } from "../ControlInterface";
import {
  AuthenticationError,
  AuthorizationError,
  DiscordConnectionError,
  DiscordError,
  ValidationError,
} from "../errors";
import { requireRole } from "./auth";
import {
  categoryResponse,
  channelResponse,
  memberResponse,
  messageResponse,
  reactionResponse,
  roleResponse,
} from "./responses";

type AppEnv = { Bindings: Env };

const bearerSecurity = [{ BearerAuth: [] }];

const ErrorSchema = z
  .object({
    detail: z.union([z.string(), z.array(z.string())]),
  })
  .openapi("Error");

const SuccessSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("Success");

const HealthSchema = z
  .object({
    status: z.literal("ok"),
  })
  .openapi("Health");

const SnowflakeSchema = z
  .string()
  .regex(/^\d+$/, "must be a Discord snowflake string")
  .openapi({
    example: "123456789012345678",
  });

const RgbColorSchema = z
  .tuple([
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
  ])
  .openapi("RgbColor");

const RoleSchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "admin" }),
    color: RgbColorSchema,
    position: z.number().int().openapi({ example: 1 }),
  })
  .openapi("Role");

const ChannelSchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "general" }),
    category_id: SnowflakeSchema.nullable(),
    position: z.number().int().openapi({ example: 1 }),
  })
  .openapi("Channel");

const CategorySchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "information" }),
    position: z.number().int().openapi({ example: 1 }),
  })
  .openapi("Category");

const MemberSchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "member-name" }),
  })
  .openapi("Member");

const MessageSchema = z
  .object({
    id: SnowflakeSchema,
    content: z.string().openapi({ example: "hello" }),
    author_id: SnowflakeSchema,
    channel_id: SnowflakeSchema,
  })
  .openapi("Message");

const ReactionSchema = z
  .object({
    emoji: z.string().openapi({ example: ":thumbsup:" }),
    member_ids: z.array(SnowflakeSchema),
    me: z.boolean(),
    message_id: SnowflakeSchema,
  })
  .openapi("Reaction");

const createRoleBodySchema = z.object({
  name: z.string(),
  color: RgbColorSchema.nullable().optional(),
  position: z.number().int().nullable().optional(),
});

const createChannelBodySchema = z.object({
  name: z.string(),
  category_id: SnowflakeSchema.nullable().optional(),
  position: z.number().int().nullable().optional(),
});

const createCategoryBodySchema = z.object({
  name: z.string(),
  position: z.number().int().nullable().optional(),
});

const idBodySchema = z.object({
  id: SnowflakeSchema,
});

const createMessageBodySchema = z.object({
  channel_id: SnowflakeSchema,
  content: z.string(),
});

const deleteMessageBodySchema = z.object({
  channel_id: SnowflakeSchema,
  message_id: SnowflakeSchema,
});

const roleIdQuerySchema = z.object({
  role_id: SnowflakeSchema.openapi({
    param: {
      name: "role_id",
      in: "query",
    },
  }),
});

const channelIdQuerySchema = z.object({
  channel_id: SnowflakeSchema.openapi({
    param: {
      name: "channel_id",
      in: "query",
    },
  }),
});

const memberIdQuerySchema = z.object({
  member_id: SnowflakeSchema.openapi({
    param: {
      name: "member_id",
      in: "query",
    },
  }),
});

const reactionTotallingQuerySchema = z.object({
  channel_id: SnowflakeSchema.openapi({
    param: {
      name: "channel_id",
      in: "query",
    },
  }),
  message_id: SnowflakeSchema.openapi({
    param: {
      name: "message_id",
      in: "query",
    },
  }),
});

function jsonContent<TSchema extends z.ZodType>(schema: TSchema, description: string) {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description,
  };
}

function jsonBody<TSchema extends z.ZodType>(schema: TSchema, description: string) {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description,
    required: true,
  };
}

function commonErrorResponses() {
  return {
    401: jsonContent(ErrorSchema, "Authentication error"),
    403: jsonContent(ErrorSchema, "Authorization error"),
    422: jsonContent(ErrorSchema, "Validation error"),
    500: jsonContent(ErrorSchema, "Internal server error"),
  };
}

function requireRoleMiddleware(role: "viewer" | "operator" | "admin"): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await requireRole(c.req.raw, c.env, role);
    await next();
  };
}

let cachedEnv: Env | null = null;
let cachedServices: Services | null = null;

export function getServices(env: Env): Services {
  if (cachedEnv !== env || cachedServices === null) {
    cachedEnv = env;
    cachedServices = createServices(env);
  }
  return cachedServices;
}

export function createApp(): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }
      return c.json(
        {
          detail: result.error.issues.map((issue) => {
            const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
            return `${path}${issue.message}`;
          }),
        },
        422,
      );
    },
  });

  app.onError((error, c) => {
    if (error instanceof AuthenticationError) {
      return c.json({ detail: error.message }, 401, { "WWW-Authenticate": "Bearer" });
    }
    if (error instanceof AuthorizationError) {
      return c.json({ detail: error.message }, 403);
    }
    if (error instanceof ValidationError) {
      return c.json({ detail: error.issues }, 422);
    }
    if (error instanceof DiscordConnectionError) {
      return c.json({ detail: error.message }, 503);
    }
    if (error instanceof DiscordError) {
      return c.json({ detail: error.message }, statusCodeForDiscordError(error));
    }
    console.error("Unhandled request failure", error);
    return c.json({ detail: "Internal Server Error" }, 500);
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      responses: {
        200: jsonContent(HealthSchema, "Health check"),
      },
    }),
    (c) => c.json({ status: "ok" as const }, 200),
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/role/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(createRoleBodySchema, "Role creation payload"),
      },
      responses: {
        200: jsonContent(RoleSchema, "Created role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const role = await getServices(c.env).roleService.createRole(
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
      path: "/api/v0/role/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(idBodySchema, "Role deletion payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Role deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).roleService.deleteRole(body.id);
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/role/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(RoleSchema), "Role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const roles = await getServices(c.env).roleService.listRoles();
      return c.json(roles.map(roleResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/role/list-members",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: roleIdQuerySchema,
      },
      responses: {
        200: jsonContent(z.array(MemberSchema), "Members with role"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const members = await getServices(c.env).roleService.listRoleMembers(query.role_id);
      return c.json(members.map(memberResponse), 200);
    },
  );

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

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/category/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(createCategoryBodySchema, "Category creation payload"),
      },
      responses: {
        200: jsonContent(CategorySchema, "Created category"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const category = await getServices(c.env).categoryService.createCategory(
        body.name,
        body.position ?? null,
      );
      return c.json(categoryResponse(category), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/category/delete",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(idBodySchema, "Category deletion payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Category deletion result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).categoryService.deleteCategory(body.id);
      return c.json({ success }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/category/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(CategorySchema), "Category list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const categories = await getServices(c.env).categoryService.listCategories();
      return c.json(categories.map(categoryResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/member/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(MemberSchema), "Member list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const members = await getServices(c.env).memberService.listMembers();
      return c.json(members.map(memberResponse), 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/member/ban",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(idBodySchema, "Member ban payload"),
      },
      responses: {
        200: jsonContent(SuccessSchema, "Member ban result"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const success = await getServices(c.env).memberService.banMember(body.id);
      return c.json({ success }, 200);
    },
  );

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

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/member/list-roles",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      request: {
        query: memberIdQuerySchema,
      },
      responses: {
        200: jsonContent(z.array(RoleSchema), "Member role list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const roles = await getServices(c.env).memberService.listMemberRoles(query.member_id);
      return c.json(roles.map(roleResponse), 200);
    },
  );

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

  app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "DiscordConnector API",
      version: "0.1.0",
    },
  });

  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}

function statusCodeForDiscordError(error: DiscordError): 400 | 403 | 404 | 502 {
  const message = error.message.toLowerCase();
  if (message.includes("no permission")) {
    return 403;
  }
  if (message.includes("no such") || message.includes("not found")) {
    return 404;
  }
  if (message.includes("http error")) {
    return 502;
  }
  return 400;
}
