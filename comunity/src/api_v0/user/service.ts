import type { Context } from "hono"
import { AppContext } from "../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** user *****
// ユーザー関連のビジネスロジック
// モックデータを使用してプロフィールや権限の操作を提供します
// *****************

const mockUser = { 
    discord_user_id: "u-123", 
    display_name: "John Doe", 
    auth_user_id: "a-123", 
    discord_id: "d-123", 
    member_id: "m-123" 
};

const mockRole = { 
    role_id: "r-123", 
    role_name: "admin" 
};

// create
// ユーザーを新規作成する
export const createUserService = async (c: Context<AppContext>) => {
    return c.json(mockUser, 201);
};

// read
// ユーザー一覧を取得する
export const listUsersService = async (c: Context<AppContext>) => {
    return c.json([mockUser], 200);
};

// 自身のユーザー情報を取得する
export const getUserMeService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    return c.json({ ...mockUser, discord_user_id: user.id }, 200);
};

// 特定ユーザーの情報を取得する
export const getUserByIdService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    return c.json({ ...mockUser }, 200);
};

// ロール一覧を取得する
export const getUserRolesService = async (c: Context<AppContext>) => {
    return c.json([mockRole], 200);
};

// update
// 自身のユーザー情報を更新する
export const updateUserMeService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    const body = await c.req.json();
    return c.json({ ...mockUser, ...body, discord_user_id: user.id }, 200);
};

// 特定ユーザーの情報を更新する
export const updateUserByIdService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockUser, ...body, discord_user_id: id }, 200);
};

// 特定ユーザーのロール割り当てを更新する
export const updateUserRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    const body = await c.req.json();
    return c.json([mockRole], 200);
};

// delete
// 特定ユーザーを削除する
export const deleteUserByIdService = async (c: Context<AppContext>) => {
    return c.body(null, 204);
};
