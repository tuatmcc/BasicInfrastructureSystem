import type { Context } from "hono"
import { AppContext } from "../../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** user role *****
// ユーザーロール管理のビジネスロジック
// ユーザーとロールの紐付けを操作します
// *****************

const mockRole = { role_id: "r-123", role_name: "admin" };

// read
// ロール一覧を取得する
export const getUserRolesService = async (c: Context<AppContext>) => {
    return c.json([mockRole], 200);
};

// update
// ロール割り当てを更新する
export const updateUserRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    return c.json([mockRole], 200);
};
