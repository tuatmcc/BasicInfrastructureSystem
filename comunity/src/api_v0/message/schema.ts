import { z } from "@hono/zod-openapi"

export const messageSchema = z.object({
    id: z.string().openapi({ example: "msg-123" }),
    channelId: z.string().openapi({ example: "channel-123" }),
    userId: z.string().openapi({ example: "user-123" }),
    content: z.string().openapi({ example: "Hello, World!" }),
    created_at: z.string().openapi({ example: "2024-01-01T12:00:00Z" }),
    updated_at: z.string().openapi({ example: "2024-01-02T12:00:00Z" }),
}).openapi("Message")

export const createMessageSchema = z.object({
    channelId: z.string().openapi({ example: "channel-123" }),
    content: z.string().openapi({ example: "Hello, World!" }),
}).openapi("CreateMessageRequest")
