import type { Context } from "hono"
import { AppContext } from "../../core/types"

// ***** role *****
// ロール定義の管理ロジック
// ロールの名前や ID などのマスターデータを操作します
// *****************

const mockRole = { 
    role_id: "r-123", 
    role_name: "admin" 
};

// create
// ロールを新規作成する
export const createRoleService = async (c: Context<AppContext>) => {
    const body = await c.req.json();
    return c.json({ ...mockRole, ...body }, 201);
};

// read
// ロール一覧を取得する
export const listRolesService = async (c: Context<AppContext>) => {
    return c.json([mockRole], 200);
};

// 特定のロール情報を取得する
export const getRoleByIdService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    return c.json({ ...mockRole}, 200);
};

// update
// ロール情報を更新する
export const updateRoleService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockRole, ...body, role_id: id }, 200);
};

// delete
// ロールを削除する
export const deleteRoleService = async (c: Context<AppContext>) => {
    return c.body(null, 204);
};
