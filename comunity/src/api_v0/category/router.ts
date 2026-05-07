import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { categorySchema, createCategorySchema, updateCategorySchema } from "./schema";
import type { AppContext } from "../../core/types";
import { 
    createCategoryService,
    listCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    deleteCategoryService
} from "./service";
import { categoryRoleRouter } from "./role/router";

import {
    createCategoryRoute,
    listCategoriesRoute,
    getCategoryByIdRoute,
    updateCategoryRoute,
    deleteCategoryRoute
} from "./schema"

// ***** category *****
// カテゴリの管理
// /: カテゴリの作成、一覧取得 (admin)
// /{id}: 特定カテゴリの取得・更新・削除 (admin)
// /role: 特定カテゴリの権限管理 (サブディレクトリへ委譲)
// *****************


export const categoryRouter = new OpenAPIHono<AppContext>()
    .openapi(createCategoryRoute, createCategoryService)
    .openapi(listCategoriesRoute, listCategoriesService)
    .openapi(getCategoryByIdRoute, getCategoryByIdService)
    .openapi(updateCategoryRoute, updateCategoryService)
    .openapi(deleteCategoryRoute, deleteCategoryService)
    .route("/", categoryRoleRouter);
