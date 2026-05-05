import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { UserSchema, UpdateUserSchema } from "./schema";
import { roleSchema } from "../role/schema";
import type { AppContext } from "../../core/types";
import { 
    createUserService, 
    listUsersService,
    getUserMeService,
    getUserByIdService,
    updateUserMeService,
    updateUserByIdService,
    deleteUserByIdService,
    getUserRolesService,
    updateUserRolesService
} from "./service";

// ***** user *****
// ユーザー情報の管理
// /me は自分自身の情報を操作し、/{id} は管理者が他者の情報を操作します
// /: ユーザーの作成、一覧取得 (admin)
// /me: 自身のユーザー情報取得・更新
// /me/role: 自身のロール一覧取得
// /{id}: 特定ユーザーの情報取得・更新・削除 (admin)
// /{id}/role: 特定ユーザーのロール一覧取得・更新 (admin)
// *****************

// create
// ユーザーを新規作成する
const createUserRoute = createRoute({
    method: "post",
    path: "/",
    responses: {
        201: {
            description: "ユーザー作成成功",
            content: { "application/json": { schema: UserSchema } }
        }
    }
});

// read
// ユーザー一覧を取得する
const listUsersRoute = createRoute({
    method: "get",
    path: "/",
    responses: {
        200: {
            description: "ユーザー一覧取得成功",
            content: { "application/json": { schema: UserSchema.array() } }
        }
    }
});

// 自身のユーザー情報を取得する
const getUserMeRoute = createRoute({
    method: "get",
    path: "/me",
    responses: {
        200: {
            description: "自身の情報取得成功",
            content: { "application/json": { schema: UserSchema } }
        }
    }
});

// 自身のロール一覧を取得する
const getUserMeRolesRoute = createRoute({
    method: "get",
    path: "/me/role",
    responses: {
        200: {
            description: "自身のロール一覧取得成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

// 特定ユーザーの情報を取得する
const getUserByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        200: {
            description: "特定ユーザーの情報取得成功",
            content: { "application/json": { schema: UserSchema } }
        }
    }
});

// 特定ユーザーのロール一覧を取得する
const getUserRolesByIdRoute = createRoute({
    method: "get",
    path: "/{id}/role",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        200: {
            description: "特定ユーザーのロール一覧取得成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

// update
// 自身のユーザー情報を更新する
const updateUserMeRoute = createRoute({
    method: "put",
    path: "/me",
    request: {
        body: {
            content: { "application/json": { schema: UpdateUserSchema } }
        }
    },
    responses: {
        200: {
            description: "自身の情報更新成功",
            content: { "application/json": { schema: UserSchema } }
        }
    }
});

// 特定ユーザーの情報を更新する
const updateUserByIdRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: UpdateUserSchema } }
        }
    },
    responses: {
        200: {
            description: "特定ユーザーの情報更新成功",
            content: { "application/json": { schema: UserSchema } }
        }
    }
});

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
// 特定ユーザーを削除する
const deleteUserByIdRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        204: {
            description: "ユーザー削除成功"
        }
    }
});

export const userRouter = new OpenAPIHono<AppContext>()
    .openapi(createUserRoute, createUserService)
    .openapi(listUsersRoute, listUsersService)
    .openapi(getUserMeRoute, getUserMeService)
    .openapi(getUserMeRolesRoute, getUserRolesService)
    .openapi(getUserByIdRoute, getUserByIdService)
    .openapi(getUserRolesByIdRoute, getUserRolesService)
    .openapi(updateUserMeRoute, updateUserMeService)
    .openapi(updateUserByIdRoute, updateUserByIdService)
    .openapi(updateUserRolesRoute, updateUserRolesService)
    .openapi(deleteUserByIdRoute, deleteUserByIdService);
