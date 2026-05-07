import type { Context } from "hono"
import { AppContext } from "../../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** category role *****
// カテゴリ権限管理のビジネスロジック
// *****************

const mockRole = { roleId: "r-123", roleName: "admin" };

// read
// ロール一覧を取得する
export const getCategoryRolesService = async (c: Context<AppContext>) => c.json([mockRole], 200);

// update
// ロール割り当てを更新する
export const updateCategoryRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    return c.json([mockRole], 200);
};
