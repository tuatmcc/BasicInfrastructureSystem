import type { Context } from "hono"
import { AppContext } from "../../core/types"

// ***** category *****
// カテゴリ管理のビジネスロジック
// *****************

const mockCategory = { category_id: "cat-123", category_name: "General" };

// create
// カテゴリを新規作成する
export const createCategoryService = async (c: Context<AppContext>) => c.json(mockCategory, 201);

// read
// カテゴリ一覧を取得する
export const listCategoriesService = async (c: Context<AppContext>) => c.json([mockCategory], 200);

// 特定のカテゴリ情報を取得する
export const getCategoryByIdService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    return c.json({ ...mockCategory }, 200);
};

// update
// カテゴリ情報を更新する
export const updateCategoryService = async (c: Context<AppContext>) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockCategory, ...body, category_id: id }, 200);
};

// delete
// カテゴリを削除する
export const deleteCategoryService = async (c: Context<AppContext>) => c.body(null, 204);
