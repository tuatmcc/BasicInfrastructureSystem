import { z } from "@hono/zod-openapi"

export const UserSchema = z.object({
    discord_user_id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    display_name: z.string().openapi({ example: "John Doe" }),
    auth_user_id: z.string().nullable().openapi({ example: "auth0|1234567890abcdef" }),
    discord_id: z.string().nullable().openapi({ example: "123456789012345678" }),
    member_id: z.string().nullable().openapi({ example: "member-123" }),
}).openapi("User")

export const UpdateUserSchema = z.object({
    display_name: z.string().optional().openapi({ example: "John Doe" }),
    auth_user_id: z.string().nullable().optional().openapi({ example: "auth0|1234567890abcdef" }),
    discord_id: z.string().nullable().optional().openapi({ example: "123456789012345678" }),
    member_id: z.string().nullable().optional().openapi({ example: "member-123" }),
}).openapi("UpdateUserRequest")