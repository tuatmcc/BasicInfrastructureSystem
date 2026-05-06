import { createRoute, z } from "@hono/zod-openapi";
import { createSelectSchema, createInsertSchema } from "drizzle-zod"
import { roles, userRole } from "../../../../drizzle/schema";

export const createUserRoleSchema = createInsertSchema(userRole).openapi("CreateUserRoleRequest")

export const getUserRoleSchema = createSelectSchema(userRole).openapi("UserRole")

export const listroleSchema = createSelectSchema(roles).openapi("Role")

// create
// 特定ユーザにロールを追加する
export const addUserRolesRoute = createRoute({
    method: "post",
    path: "/{id}/role",
    request: { 
        params: z.object({
            id: createUserRoleSchema.shape.userId,
        }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        roleId: createUserRoleSchema.shape.roleId
                    })
                }
            }
        }
    },
    responses: {
        200: {
            description: "成功",
        },
        401: { 
            description: "Unauthorized", 
            content: { "application/json": { schema: z.object({ message: z.string() }) } } 
        }
    }
});

// read
// 自身のロール一覧を取得する
export const getUserMeRolesRoute = createRoute({
    method: "get",
    path: "/me/role",
    responses: {
        200: {
            description: "成功",
            content: { "application/json": { schema: listroleSchema.array() } }
        }
    }
});

// 特定ユーザーのロール一覧を取得する
export const getUserRolesByIdRoute = createRoute({
    method: "get",
    path: "/{id}/role",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: {
            description: "成功",
            content: { "application/json": { schema: listroleSchema.array() } }
        },401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ message: z.string() }) } } }
    
    }
});

// update
// create,deleteで行う

//del
// 特定ユーザにロールを削除
export const delUserRolesRoute = createRoute({
    method: "delete",
    path: "/{id}/role",
    request: { 
        params: z.object({
            id: createUserRoleSchema.shape.userId,
        }),
        body: {
            content: {
                "application/json": {
                    schema: z.object({
                        roleId: createUserRoleSchema.shape.roleId
                    })
                }
            }
        }
    },
    responses: {
        200: {
            description: "成功",
        },
        401: { 
            description: "Unauthorized", 
            content: { "application/json": { schema: z.object({ message: z.string() }) } } 
        }
    }
});