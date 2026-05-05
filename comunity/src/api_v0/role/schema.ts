import { z } from "@hono/zod-openapi"

export const roleSchema = z.object({
    role_id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    role_name: z.string().openapi({ example: "admin" }),
}).openapi("Role")

export const updateRoleSchema = z.object({
    role_id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    role_name: z.string().openapi({ example: "admin" }).nullable()
}).openapi("UpdateRoleRequest")