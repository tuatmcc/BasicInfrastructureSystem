import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { roleSchema, updateRoleSchema } from "./schema";
import type { AppContext } from "../../core/types";
import {
    createRoleService,
    listRolesService,
    getRoleByIdService,
    updateRoleService,
    deleteRoleService
} from "./service";

// ***** role *****
// ロール定義（マスターデータ）の管理
// システム全体で利用可能なロール（管理者、一般等）の定義自体を操作します
// /: ロールの一覧取得、新規作成 (admin)
// /{id}: 特定のロール定義の取得・更新・削除 (admin)
// *****************

// create
// 新しいロールを定義する
const createRoleRoute = createRoute({
    method: "post",
    path: "/",
    request: {
        body: { content: { "application/json": { schema: roleSchema } } }
    },
    responses: {
        201: {
            description: "ロール作成成功",
            content: { "application/json": { schema: roleSchema } }
        }
    }
});

// read
// 定義済みロールの一覧を取得する
const listRolesRoute = createRoute({
    method: "get",
    path: "/",
    responses: {
        200: {
            description: "ロール一覧取得成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

// ロール定義の詳細を取得する
const getRoleByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        200: {
            description: "ロール詳細取得成功",
            content: { "application/json": { schema: roleSchema } }
        }
    }
});

// update
// ロール定義を更新する
const updateRoleRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() }),
        body: { content: { "application/json": { schema: updateRoleSchema } } }
    },
    responses: {
        200: {
            description: "ロール更新成功",
            content: { "application/json": { schema: roleSchema } }
        }
    }
});

// delete
// ロール定義を削除する
const deleteRoleRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        204: {
            description: "ロール削除成功"
        }
    }
});

export const roleRouter = new OpenAPIHono<AppContext>()
    .openapi(createRoleRoute, createRoleService)
    .openapi(listRolesRoute, listRolesService)
    .openapi(getRoleByIdRoute, getRoleByIdService)
    .openapi(updateRoleRoute, updateRoleService)
    .openapi(deleteRoleRoute, deleteRoleService);
