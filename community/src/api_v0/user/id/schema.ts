import { createRoute, z } from "@hono/zod-openapi";
import { getUserSchema, UpdateUserSchema } from "../schema";

const errorMessageSchema = z.object({ message: z.string() });

// 特定ユーザーの情報を取得する
export const getUserByIdRoute = createRoute({
    method: "get",
    path: "/",
    request: { params: z.object({ id: z.string() }) },
     responses: { 
        200: { description: "成功", content: { "application/json": { schema: getUserSchema } } } ,
        401: { description: "Unauthorized", content: { "application/json": { schema: errorMessageSchema } } },
        403: { description: "Forbidden", content: { "application/json": { schema: errorMessageSchema } } },
        404: { description: "Not Found", content: { "application/json": { schema: errorMessageSchema } } }
    }
});

// 特定ユーザーの情報を更新する
export const updateUserByIdRoute = createRoute({
    method: "put",
    path: "/",
    request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: UpdateUserSchema } } } },
    responses: { 
         200: { description: "成功", content: { "application/json": { schema: getUserSchema } } } ,
        401: { description: "Unauthorized", content: { "application/json": { schema: errorMessageSchema } } },
        403: { description: "Forbidden", content: { "application/json": { schema: errorMessageSchema } } },
        404: { description: "Not Found", content: { "application/json": { schema: errorMessageSchema } } }
     }
});

// 特定ユーザーを削除する
export const deleteUserByIdRoute = createRoute({
    method: "delete",
    path: "/",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        204: { description: "成功" },
        401: { description: "Unauthorized", content: { "application/json": { schema: errorMessageSchema } } },
        403: { description: "Forbidden", content: { "application/json": { schema: errorMessageSchema } } }
    }
});
