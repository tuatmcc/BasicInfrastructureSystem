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

// ***** category *****
// カテゴリの管理
// /: カテゴリの作成、一覧取得 (admin)
// /{id}: 特定カテゴリの取得・更新・削除 (admin)
// /role: 特定カテゴリの権限管理 (サブディレクトリへ委譲)
// *****************

// create
const createCategoryRoute = createRoute({
    method: "post",
    path: "/",
    request: { body: { content: { "application/json": { schema: createCategorySchema } } } },
    responses: { 201: { description: "成功", content: { "application/json": { schema: categorySchema } } } }
});

// read
const listCategoriesRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 200: { description: "成功", content: { "application/json": { schema: categorySchema.array() } } } }
});

const getCategoryByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "成功", content: { "application/json": { schema: categorySchema } } } }
});

// update
const updateCategoryRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: updateCategorySchema } } } },
    responses: { 200: { description: "成功", content: { "application/json": { schema: categorySchema } } } }
});

// delete
const deleteCategoryRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: "成功" } }
});

export const categoryRouter = new OpenAPIHono<AppContext>()
    .openapi(createCategoryRoute, createCategoryService)
    .openapi(listCategoriesRoute, listCategoriesService)
    .openapi(getCategoryByIdRoute, getCategoryByIdService)
    .openapi(updateCategoryRoute, updateCategoryService)
    .openapi(deleteCategoryRoute, deleteCategoryService)
    .route("/", categoryRoleRouter);
