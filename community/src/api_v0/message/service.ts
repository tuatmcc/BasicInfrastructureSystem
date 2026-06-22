import { RouteHandler } from "@hono/zod-openapi"
import { AppContext } from "../../core/types"
import { createMessageRoute } from "./schema"

// ***** message *****
// イベント通知メッセージ送信のビジネスロジック
// リクエストを受け取り、Discord 操作（community プロバイダ）へ委譲します
// *****************

// create
// イベント通知メッセージを Discord へ送信し、メッセージIDを返す
export const createMessageService: RouteHandler<typeof createMessageRoute, AppContext> = async (c) => {
    const body = c.req.valid("json");
    const community = c.get("community");

    const result = await community.sendMessage({
        channelId: body.channelId,
        content: body.content,
        mentionRoleIds: body.mentionRoleIds,
    });

    return c.json(result, 201);
};
