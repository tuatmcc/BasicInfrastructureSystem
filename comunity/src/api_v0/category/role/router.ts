import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { roleSchema } from "../../role/schema";
import type { AppContext } from "../../../core/types";
import { 
    getCategoryRolesService,
    updateCategoryRolesService
} from "./service";

// ***** category role *****
// カテゴリへのアクセス権限管理
// /category/{id}/role として動作します
// /{id}/role: 特定カテゴリのロール一覧取得・更新 (admin)
// *****************

// read
// カテゴリのロール一覧を取得する
const getCategoryRolesRoute = createRoute({
    method: "get",
    path: "/{id}/role",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: {
            description: "成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

// update
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
                        role_ids: z.string().array()
                    })
                }
            }
        }
    },
    responses: {
        200: {
            description: "成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

export const categoryRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(getCategoryRolesRoute, getCategoryRolesService)
    .openapi(updateCategoryRolesRoute, updateCategoryRolesService);
