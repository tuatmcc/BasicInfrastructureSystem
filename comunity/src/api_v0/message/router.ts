import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { messageSchema, createMessageSchema } from "./schema";
import type { AppContext } from "../../core/types";
import { createMessageService } from "./service";

// ***** message *****
// メッセージの管理
// チャンネル内へのメッセージ投稿を管理します
// /: メッセージの新規作成
// *****************

// create
// 新しいメッセージを投稿する
const createMessageRoute = createRoute({
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

export const messageRouter = new OpenAPIHono<AppContext>()
    .openapi(createMessageRoute, createMessageService);
