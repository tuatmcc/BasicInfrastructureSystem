import { z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { createServices, type Services } from "../ControlInterface";
import { requireRole } from "./auth";

export type AppEnv = { Bindings: Env };

export const bearerSecurity = [{ BearerAuth: [] }];

export const ErrorSchema = z
  .object({
    detail: z.union([z.string(), z.array(z.string())]),
  })
  .openapi("Error");

export const SuccessSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("Success");

export const HealthSchema = z
  .object({
    status: z.literal("ok"),
  })
  .openapi("Health");

export const SnowflakeSchema = z
  .string()
  .regex(/^\d+$/, "must be a Discord snowflake string")
  .openapi({
    example: "123456789012345678",
  });

export const RgbColorSchema = z
  .tuple([
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
  ])
  .openapi("RgbColor");

export const RoleSchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "admin" }),
    color: RgbColorSchema,
    position: z.number().int().openapi({ example: 1 }),
  })
  .openapi("Role");

export const ChannelSchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "general" }),
    category_id: SnowflakeSchema.nullable(),
    position: z.number().int().openapi({ example: 1 }),
  })
  .openapi("Channel");

export const CategorySchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "information" }),
    position: z.number().int().openapi({ example: 1 }),
  })
  .openapi("Category");

export const MemberSchema = z
  .object({
    id: SnowflakeSchema,
    name: z.string().openapi({ example: "member-name" }),
  })
  .openapi("Member");

export const MessageSchema = z
  .object({
    id: SnowflakeSchema,
    content: z.string().openapi({ example: "hello" }),
    author_id: SnowflakeSchema,
    channel_id: SnowflakeSchema,
  })
  .openapi("Message");

export const ReactionSchema = z
  .object({
    emoji: z.string().openapi({ example: ":thumbsup:" }),
    member_ids: z.array(SnowflakeSchema),
    me: z.boolean(),
    message_id: SnowflakeSchema,
  })
  .openapi("Reaction");

export const createRoleBodySchema = z.object({
  name: z.string(),
  color: RgbColorSchema.nullable().optional(),
  position: z.number().int().nullable().optional(),
});

export const createChannelBodySchema = z.object({
  name: z.string(),
  category_id: SnowflakeSchema.nullable().optional(),
  position: z.number().int().nullable().optional(),
});

export const createCategoryBodySchema = z.object({
  name: z.string(),
  position: z.number().int().nullable().optional(),
});

export const idBodySchema = z.object({
  id: SnowflakeSchema,
});

export const createMessageBodySchema = z.object({
  channel_id: SnowflakeSchema,
  content: z.string(),
});

export const deleteMessageBodySchema = z.object({
  channel_id: SnowflakeSchema,
  message_id: SnowflakeSchema,
});

export const roleIdQuerySchema = z.object({
  role_id: SnowflakeSchema.openapi({
    param: {
      name: "role_id",
      in: "query",
    },
  }),
});

export const channelIdQuerySchema = z.object({
  channel_id: SnowflakeSchema.openapi({
    param: {
      name: "channel_id",
      in: "query",
    },
  }),
});

export const memberIdQuerySchema = z.object({
  member_id: SnowflakeSchema.openapi({
    param: {
      name: "member_id",
      in: "query",
    },
  }),
});

export const reactionTotallingQuerySchema = z.object({
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

export function jsonContent<TSchema extends z.ZodType>(schema: TSchema, description: string) {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description,
  };
}

export function jsonBody<TSchema extends z.ZodType>(schema: TSchema, description: string) {
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

export function commonErrorResponses() {
  return {
    401: jsonContent(ErrorSchema, "Authentication error"),
    403: jsonContent(ErrorSchema, "Authorization error"),
    422: jsonContent(ErrorSchema, "Validation error"),
    500: jsonContent(ErrorSchema, "Internal server error"),
  };
}

export function requireRoleMiddleware(role: "viewer" | "operator" | "admin"): MiddlewareHandler<AppEnv> {
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
