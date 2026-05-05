import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { roleSchema } from "../../role/schema";
import type { AppContext } from "../../../core/types";
import { 
    getChannelRolesService,
    updateChannelRolesService
} from "./service";

// ***** channel role *****
// チャンネルへのアクセス権限管理
// /channel/{id}/role として動作します
// /{id}/role: 特定チャンネルのロール一覧取得・更新 (admin)
// *****************

// read
const getChannelRolesRoute = createRoute({
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
const updateChannelRolesRoute = createRoute({
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

export const channelRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(getChannelRolesRoute, getChannelRolesService)
    .openapi(updateChannelRolesRoute, updateChannelRolesService);
