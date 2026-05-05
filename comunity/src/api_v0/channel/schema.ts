import { z } from "@hono/zod-openapi"

export const channelSchema = z.object({
    channel_id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    channel_name: z.string().openapi({ example: "admin" }),
    category_id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }).nullable(),
}).openapi("Channel")

export const updateChannelSchema = z.object({
    channel_name: z.string().openapi({ example: "admin" }).nullable(),
    category_id: z.string().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }).nullable(), 
}).openapi("UpdateChannelRequest")