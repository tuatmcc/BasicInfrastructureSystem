import type { Context } from "hono"
import { AppContext } from "../../core/types"
import { HTTPException } from "hono/http-exception"

// ***** category *****
// カテゴリ管理のビジネスロジック
// チャンネルのグループ化と閲覧権限の制御を行います
// *****************

const mockCategory = { 
    category_id: "cat-123", 
    category_name: "General" 
};

const mockRole = { 
    role_id: "r-123", 
    role_name: "admin" 
};

// create
// カテゴリを新規作成する
export const createCategoryService = async (c: Context<AppContext>) => {
    const body = await c.req.json();
    return c.json({ ...mockCategory, ...body }, 201);
};

// read
// カテゴリ一覧を取得する
export const listCategoriesService = async (c: Context<AppContext>) => {
    return c.json([mockCategory], 200);
};

// 特定のカテゴリ情報を取得する
export const getCategoryByIdService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    return c.json({ ...mockCategory}, 200);
};

// カテゴリに割り当てられたロール一覧を取得する
export const getCategoryRolesService = async (c: Context<AppContext>) => {
    return c.json([mockRole], 200);
};

// update
// カテゴリ情報を更新する
export const updateCategoryService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockCategory, ...body, category_id: id }, 200);
};

// カテゴリのロール割り当てを更新する
export const updateCategoryRolesService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    const body = await c.req.json();
    return c.json([mockRole], 200);
};

// delete
// カテゴリを削除する
export const deleteCategoryService = async (c: Context<AppContext>) => {
    return c.body(null, 204);
};
