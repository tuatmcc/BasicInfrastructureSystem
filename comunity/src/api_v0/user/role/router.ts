import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { roleSchema } from "../../role/schema";
import type { AppContext } from "../../../core/types";
import { 
    getUserRolesService,
    updateUserRolesService
} from "./service";

// ***** user role *****
// ユーザーへのロール割り当て管理
// /user/{id}/role および /user/me/role を管理します
// /me/role: 自身のロール一覧取得
// /{id}/role: 特定ユーザーのロール一覧取得・更新 (admin)
// *****************

// read
// 自身のロール一覧を取得する
const getUserMeRolesRoute = createRoute({
    method: "get",
    path: "/me/role",
    responses: {
        200: {
            description: "成功",
            content: { "application/json": { schema: roleSchema.array() } }
        },
        404: {
            description:""
        }
    }
});

// 特定ユーザーのロール一覧を取得する
const getUserRolesByIdRoute = createRoute({
    method: "get",
    path: "/{id}/role",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: {
            description: "成功",
            content: { "application/json": { schema: roleSchema.array() } }
        },
        404: {
            description:""
        }
    }
});

// update
// 特定ユーザーのロール割り当てを更新する
const updateUserRolesRoute = createRoute({
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

export const userRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(getUserMeRolesRoute, getUserRolesService)
    .openapi(getUserRolesByIdRoute, getUserRolesService)
    .openapi(updateUserRolesRoute, updateUserRolesService);
