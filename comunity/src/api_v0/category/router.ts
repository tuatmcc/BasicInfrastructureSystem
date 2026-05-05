import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { categorySchema, createCategorySchema, updateCategorySchema } from "./schema";
import { roleSchema } from "../role/schema";
import type { AppContext } from "../../core/types";
import { 
    createCategoryService,
    listCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    deleteCategoryService,
    getCategoryRolesService,
    updateCategoryRolesService
} from "./service";

// ***** category *****
// チャンネルカテゴリの管理
// チャンネルを束ねるカテゴリと、そのアクセス権限（Role）を管理します
// /: カテゴリの一覧取得、新規作成 (admin)
// /{id}: 特定カテゴリの取得・更新・削除 (admin)
// /{id}/role: カテゴリに許可されたロールの取得・更新 (admin)
// *****************

// create
// 新規カテゴリを作成する
const createCategoryRoute = createRoute({
    method: "post",
    path: "/",
    request: {
        body: { content: { "application/json": { schema: createCategorySchema } } }
    },
    responses: {
        201: {
            description: "カテゴリ作成成功",
            content: { "application/json": { schema: categorySchema } }
        }
    }
});

// read
// カテゴリ一覧を取得する
const listCategoriesRoute = createRoute({
    method: "get",
    path: "/",
    responses: {
        200: {
            description: "カテゴリ一覧取得成功",
            content: { "application/json": { schema: categorySchema.array() } }
        }
    }
});

// カテゴリ詳細を取得する
const getCategoryByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        200: {
            description: "カテゴリ詳細取得成功",
            content: { "application/json": { schema: categorySchema } }
        }
    }
});

// カテゴリに割り当てられたロール一覧を取得する
const getCategoryRolesRoute = createRoute({
    method: "get",
    path: "/{id}/role",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        200: {
            description: "ロール一覧取得成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

// update
// カテゴリ情報を更新する
const updateCategoryRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() }),
        body: { content: { "application/json": { schema: updateCategorySchema } } }
    },
    responses: {
        200: {
            description: "カテゴリ更新成功",
            content: { "application/json": { schema: categorySchema } }
        }
    }
});

// カテゴリのロール割り当てを更新する
const updateCategoryRolesRoute = createRoute({
    method: "put",
    path: "/{id}/role",
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        role_ids: z.string().array().openapi({ example: ["role-1", "role-2"] })
                    })
                }
            }
        }
    },
    responses: {
        200: {
            description: "ロール割り当て更新成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

// delete
// カテゴリを削除する
const deleteCategoryRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        204: {
            description: "カテゴリ削除成功"
        }
    }
});

export const categoryRouter = new OpenAPIHono<AppContext>()
    .openapi(createCategoryRoute, createCategoryService)
    .openapi(listCategoriesRoute, listCategoriesService)
    .openapi(getCategoryByIdRoute, getCategoryByIdService)
    .openapi(updateCategoryRoute, updateCategoryService)
    .openapi(deleteCategoryRoute, deleteCategoryService)
    .openapi(getCategoryRolesRoute, getCategoryRolesService)
    .openapi(updateCategoryRolesRoute, updateCategoryRolesService);
