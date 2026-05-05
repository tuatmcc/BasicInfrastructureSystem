import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { UserSchema, UpdateUserSchema } from "./schema";
import type { AppContext } from "../../core/types";
import { 
    createUserService, 
    listUsersService,
    getUserMeService,
    getUserByIdService,
    updateUserMeService,
    updateUserByIdService,
    deleteUserByIdService
} from "./service";
import { userRoleRouter } from "./role/router";

// ***** user *****
// ユーザー情報の管理
// /: ユーザーの作成、一覧取得 (admin)
// /me: 自身のプロフィール操作
// /{id}: 特定ユーザーのプロフィール操作 (admin)
// /role: ユーザーのロール管理ロジック (サブディレクトリへ委譲)
// *****************

// create
// ユーザーを新規作成する
const createUserRoute = createRoute({
    method: "post",
    path: "/",
    responses: { 201: { description: "成功", content: { "application/json": { schema: UserSchema } } } }
});

// read
// ユーザー一覧を取得する
const listUsersRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 200: { description: "成功", content: { "application/json": { schema: UserSchema.array() } } } }
});

// 自身の情報を取得する
const getUserMeRoute = createRoute({
    method: "get",
    path: "/me",
    responses: { 200: { description: "成功", content: { "application/json": { schema: UserSchema } } } }
});

// 特定ユーザーの情報を取得する
const getUserByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "成功", content: { "application/json": { schema: UserSchema } } } }
});

// update
// 自身の情報を更新する
const updateUserMeRoute = createRoute({
    method: "put",
    path: "/me",
    request: { body: { content: { "application/json": { schema: UpdateUserSchema } } } },
    responses: { 200: { description: "成功", content: { "application/json": { schema: UserSchema } } } }
});

// 特定ユーザーの情報を更新する
const updateUserByIdRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: UpdateUserSchema } } } },
    responses: { 200: { description: "成功", content: { "application/json": { schema: UserSchema } } } }
});

// delete
// 特定ユーザーを削除する
const deleteUserByIdRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: "成功" } }
});

export const userRouter = new OpenAPIHono<AppContext>()
    .openapi(createUserRoute, createUserService)
    .openapi(listUsersRoute, listUsersService)
    .openapi(getUserMeRoute, getUserMeService)
    .openapi(getUserByIdRoute, getUserByIdService)
    .openapi(updateUserMeRoute, updateUserMeService)
    .openapi(updateUserByIdRoute, updateUserByIdService)
    .openapi(deleteUserByIdRoute, deleteUserByIdService)
    .route("/", userRoleRouter);
