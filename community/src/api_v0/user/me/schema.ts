import { createRoute, z } from "@hono/zod-openapi";
import { getUserSchema, UpdateUserMeSchema } from "../schema";

// 自身の情報を取得する
export const getUserMeRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 
        200: { description: "成功", content: { "application/json": { schema: getUserSchema } } },
        404: { description: "Not Found", content: { "application/json": { schema: z.object({ error: z.string() }) } } }
    }
});

// 自身の情報を更新する
export const updateUserMeRoute = createRoute({
    method: "put",
    path: "/",
    request: { body: { content: { "application/json": { schema: UpdateUserMeSchema } } } },
    responses: { 
        200: { description: "成功", content: { "application/json": { schema: getUserSchema } } },
        404: { description: "Not Found", content: { "application/json": { schema: z.object({ error: z.string() }) } } }
    }
});
