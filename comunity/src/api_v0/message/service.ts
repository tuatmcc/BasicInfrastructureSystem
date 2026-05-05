import type { Context } from "hono"
import { AppContext } from "../../core/types"

// ***** message *****
// メッセージ投稿のビジネスロジック
// ユーザーからのメッセージを受け取り、保存処理を行います
// *****************

const mockMessage = {
    id: "msg-123",
    channelId: "channel-123",
    userId: "user-123",
    content: "Hello, World!",
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-02T12:00:00Z",
};

// create
// メッセージを新規作成する
export const createMessageService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    const body = await c.req.json();
    return c.json({ ...mockMessage, userId: user.id, ...body }, 201);
};
