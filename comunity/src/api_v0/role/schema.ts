import { z, createRoute } from "@hono/zod-openapi"
import { roles } from "../../../drizzle/schema"
import { createSelectSchema, createInsertSchema } from "drizzle-zod"

// ***** Schemas *****

export const roleSchema = createSelectSchema(roles).openapi("Role")

export const createRoleSchema = createInsertSchema(roles).omit({ roleId: true }).openapi("CreateRoleRequest")

export const updateRoleSchema = createInsertSchema(roles).omit({ roleId: true }).partial().openapi("UpdateRoleRequest")

export const errorSchema = z.object({
    error: z.string().openapi({ example: "Not Found" }),
    message: z.string().optional().openapi({ example: "Detailed error message" })
}).openapi("Error")

// ***** Route Definitions *****

export const createRoleRoute = createRoute({
    method: "post",
    path: "/",
    request: {
        body: { content: { "application/json": { schema:  createRoleSchema } } }
    },
    responses: {
        201: {
            description: "ロール作成成功",
            content: { "application/json": { schema: roleSchema } }
        }
    }
});

export const listRolesRoute = createRoute({
    method: "get",
    path: "/",
    responses: {
        200: {
            description: "ロール一覧取得成功",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});

export const getRoleByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: {
        params: z.object({ id: z.uuid() })
    },
    responses: {
        200: {
            description: "ロール詳細取得成功",
            content: { "application/json": { schema: roleSchema } }
        },
        404: {
            description: "ロールが見つかりません",
            content: { "application/json": { schema: errorSchema } }
        }
    }
});

export const updateRoleRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: {
        params: z.object({ id: z.uuid() }),
        body: { content: { "application/json": { schema: updateRoleSchema } } }
    },
    responses: {
        200: {
            description: "ロール更新成功",
            content: { "application/json": { schema: roleSchema } }
        },
        404: {
            description: "ロールが見つかりません",
            content: { "application/json": { schema: errorSchema } }
        }
    }
});

export const deleteRoleRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: {
        params: z.object({ id: z.uuid() })
    },
    responses: {
        204: {
            description: "ロール削除成功"
        }
    }
});
