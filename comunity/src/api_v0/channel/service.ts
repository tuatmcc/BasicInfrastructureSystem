import type { Context } from "hono"
import { AppContext } from "../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** channel *****
// チャンネル管理のビジネスロジック
// メッセージ投稿場所の管理とアクセス制御を行います
// *****************

const mockChannel = { 
    channel_id: "ch-123", 
    channel_name: "General", 
    category_id: "cat-123" 
};

const mockRole = { 
    role_id: "r-123", 
    role_name: "admin" 
};

// create
// チャンネルを新規作成する
export const createChannelService = async (c: Context<AppContext>) => {
    const body = await c.req.json();
    return c.json({ ...mockChannel, ...body }, 201);
};

// read
// チャンネル情報を取得する
export const getChannelService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    return c.json({ ...mockChannel, channel_id: id }, 200);
};

// チャンネルに割り当てられたロール一覧を取得する
export const getChannelRolesService = async (c: Context<AppContext>) => {
    return c.json([mockRole], 200);
};

// update
// チャンネル情報を更新する
export const updateChannelService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockChannel, ...body, channel_id: id }, 200);
};

// チャンネルのロール割り当てを更新する
export const updateChannelRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    const body = await c.req.json();
    return c.json([mockRole], 200);
};

// delete
// チャンネルを削除する
export const deleteChannelService = async (c: Context<AppContext>) => {
    return c.body(null, 204);
};
