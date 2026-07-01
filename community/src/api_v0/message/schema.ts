import { z } from "@hono/zod-openapi"
import { createRoute } from "@hono/zod-openapi";

const discordSnowflakeSchema = z.string()
    .regex(/^\d{17,20}$/)
    .openapi({ example: "1450087368114704484" });

const errorSchema = z.object({
    error: z.string(),
}).openapi("ErrorResponse");

// ***** message *****
// イベント通知メッセージの管理
// Discord へイベント通知メッセージを送信します
// /: メッセージの送信
// *****************

// リクエスト: 送信するメッセージ内容とメンションするロールID一覧
export const sendMessageSchema = z.object({
    channelId: discordSnowflakeSchema,
    content: z.string()
        .min(1)
        .max(2000)
        .openapi({ example: "イベントが開始されました！" }),
    mentionRoleIds: z.array(discordSnowflakeSchema)
        .max(100)
        .optional()
        .openapi({ example: ["1450087368114704484"] }),
}).openapi("SendMessageRequest")

// レスポンス: 送信したメッセージのID
export const messageResultSchema = z.object({
    messageId: z.string().openapi({ example: "1450087368114704484" }),
}).openapi("SendMessageResult")

// create
// イベント通知メッセージを Discord へ送信する
export const createMessageRoute = createRoute({
    method: "post",
    path: "/",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: sendMessageSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "メッセージ送信成功",
            content: {
                "application/json": {
                    schema: messageResultSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        403: {
            description: "Forbidden",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        404: {
            description: "Not Found",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        502: {
            description: "Bad Gateway",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
    },
});
