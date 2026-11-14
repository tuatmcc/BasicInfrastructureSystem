import { createRoute, z } from "@hono/zod-openapi";
import { roleSchema } from "../../../role/schema";

export const getUserRolesByIdRoute = createRoute({
    method: "get",
    path: "/",
    request: { params: z.object({ id: z.string() }) },
    responses: {
        200: {
            description: "特定ユーザーのロール一覧を取得",
            content: { "application/json": { schema: roleSchema.array() } }
        },
        404: { description: "Not Found" }
    }
});

export const updateUserRolesRoute = createRoute({
    method: "put",
    path: "/",
    request: {
        params: z.object({ id: z.string() }),
        body: { content: { "application/json": { schema: z.object({ role_ids: z.string().array() }) } } }
    },
    responses: {
        200: {
            description: "特定ユーザーのロールを更新",
            content: { "application/json": { schema: roleSchema.array() } }
        }
    }
});
