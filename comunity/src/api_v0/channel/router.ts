import { createRoute , OpenAPIHono, z } from "@hono/zod-openapi"
import { channelSchema, updateChannelSchema} from "./schema" 
import { AppContext } from "../../core/types"
import { authMiddleware } from "../../core/auth"
import {
    createChannelService,
    getChannelService,
    updateChannelService,
    deleteChannelService
} from "./service"
import { channelRoleRouter } from "./role/router";

// ***** channel *****
// チャンネルの管理
// /: チャンネルの作成 (admin)
// /{id}: 特定チャンネルの取得・更新・削除 (admin)
// /{id}/role: 特定チャンネルの権限管理 (サブディレクトリへ委譲)
// *****************

// create
const createChannelRoute = createRoute({
    method: "post",
    path: "/",
    middleware: [authMiddleware] as const,
    responses: { 201: { description: "成功", content: { "application/json": { schema: channelSchema } } } }
});

// read
const getChannelRoute = createRoute({
    method: "get",
    path: "/{id}",
    middleware: [authMiddleware] as const,
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "成功", content: { "application/json": { schema: channelSchema } } } }
});

// update
const updateChannelRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: updateChannelSchema } } } },
    responses: { 200: { description: "成功", content: { "application/json": { schema: channelSchema } } } }
});

// delete
const deleteChannelRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: "成功" } }
});

export const channelRouter = new OpenAPIHono<AppContext>()
    .openapi(createChannelRoute, createChannelService)
    .openapi(getChannelRoute, getChannelService)
    .openapi(updateChannelRoute, updateChannelService)
    .openapi(deleteChannelRoute, deleteChannelService)
    .route("/", channelRoleRouter);
