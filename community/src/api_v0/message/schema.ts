import { z } from "@hono/zod-openapi"
import { createRoute } from "@hono/zod-openapi";

// ***** message *****
// イベント通知メッセージの管理
// Discord へイベント通知メッセージを送信します
// /: メッセージの送信
// *****************

// リクエスト: 送信するメッセージ内容とメンションするロールID一覧
export const sendMessageSchema = z.object({
    channelId: z.string().openapi({ example: "1450087368114704484" }),
    content: z.string().openapi({ example: "イベントが開始されました！" }),
    mentionRoleIds: z.array(z.string())
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
        403: {
            description: "Forbidden",
            content: {
                "application/json": {
                    schema: z.object({ error: z.string() }),
                },
            },
        },
    },
});
