import { RouteHandler } from "@hono/zod-openapi"
import { AppContext } from "../../core/types"
import { CommunityProviderError } from "../../lib/community/error"
import { createMessageRoute } from "./schema"

// ***** message *****
// イベント通知メッセージ送信のビジネスロジック
// リクエストを受け取り、Discord 操作（community プロバイダ）へ委譲します
// *****************

// create
// イベント通知メッセージを Discord へ送信し、メッセージIDを返す
export const createMessageService: RouteHandler<typeof createMessageRoute, AppContext> = async (c) => {
    const body = c.req.valid("json");
    const appUser = c.get("appUser");
    const community = c.get("community");

    if (appUser.role !== "admin") {
        return c.json({ error: "Forbidden" }, 403);
    }

    try {
        const result = await community.sendMessage({
            channelId: body.channelId,
            content: body.content,
            mentionRoleIds: body.mentionRoleIds,
        });

        return c.json(result, 201);
    } catch (error) {
        if (error instanceof CommunityProviderError) {
            if (error.status === 400 || error.status === 403 || error.status === 404) {
                return c.json({ error: "Discord request failed" }, error.status);
            }

            return c.json({ error: "Discord service unavailable" }, 502);
        }

        throw error;
    }
};
