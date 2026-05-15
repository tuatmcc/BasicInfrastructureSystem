import { z } from "@hono/zod-openapi"
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

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


// ***** message *****
// メッセージの管理
// チャンネル内へのメッセージ投稿を管理します
// /: メッセージの新規作成
// *****************

// create
// 新しいメッセージを投稿する
export const createMessageRoute = createRoute({
    method: "post",
    path: "/",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createMessageSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "メッセージ送信成功",
            content: {
                "application/json": {
                    schema: messageSchema,
                },
            },
        },
    },
});