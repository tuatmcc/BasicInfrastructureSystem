import type { Context } from "hono"
import { AppContext } from "../../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** user role *****
// ユーザーロール管理のビジネスロジック
// ユーザーとロールの紐付けを操作します
// *****************

// read
// ロール一覧を取得する
export const getUserRolesService = async (c: Context<AppContext>) => {
    // パスパラメータ {id} があればそれを使い、なければ自身のID（meの場合）を使う
    const userId = c.req.param("id") || c.get("appUser").discordid;
    
    if(!userId) return c.json({ error: "User ID not found" }, 404);

    // Discord からロール一覧を取得
    const discordRoles = await c.get("community").listUserRoles(userId);

    // API のレスポンス形式 (roleId, roleName) に変換
    // 注意: Discord の ID は Snowflake (数値文字列) です
    const roles = discordRoles.map(r => ({
        roleId: r.id,
        roleName: r.name
    }));

    return c.json(roles, 200);
};

// update
// ロール割り当てを更新する
export const updateUserRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    const mockRole = { roleId: "r-123", roleName: "admin" };
    return c.json([mockRole], 200);
};
