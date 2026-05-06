import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { roleSchema } from "../../role/schema";
import type { AppContext } from "../../../core/types";
import { 
    addUserRolesService,
    getUserRolesMeService,
    getUserRolesByIdService,
    delUserRolesService
} from "./service";
import{
    addUserRolesRoute,
    getUserMeRolesRoute,
    getUserRolesByIdRoute,
    delUserRolesRoute
} from "./schema"

// ***** user role *****
// ユーザーへのロール割り当て管理
// /user/{id}/role および /user/me/role を管理します
// /me/role: 自身のロール一覧取得
// /{id}/role: 特定ユーザーのロール一覧取得・更新 (admin)
// *****************


export const userRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(addUserRolesRoute, addUserRolesService)
    .openapi(getUserMeRolesRoute, getUserRolesMeService)
    .openapi(getUserRolesByIdRoute, getUserRolesByIdService)
    .openapi(delUserRolesRoute, delUserRolesService)
