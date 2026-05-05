import type { Context } from "hono"
import { AppContext } from "../../core/types"

// ***** channel *****
// チャンネル管理のビジネスロジック
// *****************

const mockChannel = { 
    channel_id: "ch-123", 
    channel_name: "General", 
    category_id: "cat-123" 
};

// create
// チャンネルを新規作成する
export const createChannelService = async (c: Context<AppContext>) => c.json(mockChannel, 201);

// read
// チャンネル情報を取得する
export const getChannelService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    return c.json({ ...mockChannel}, 200);
};

// update
// チャンネル情報を更新する
export const updateChannelService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockChannel, ...body, channel_id: id }, 200);
};

// delete
// チャンネルを削除する
export const deleteChannelService = async (c: Context<AppContext>) => c.body(null, 204);
