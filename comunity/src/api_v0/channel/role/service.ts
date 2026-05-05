import type { Context } from "hono"
import { AppContext } from "../../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** channel role *****
// チャンネル権限管理のビジネスロジック
// *****************

const mockRole = { role_id: "r-123", role_name: "admin" };

// read
// ロール一覧を取得する
export const getChannelRolesService = async (c: Context<AppContext>) => c.json([mockRole], 200);

// update
// ロール割り当てを更新する
export const updateChannelRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    return c.json([mockRole], 200);
};
