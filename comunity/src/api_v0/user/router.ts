import { OpenAPIHono} from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";

import { 
    createUserRoute,
    listUsersRoute,
    getUserMeRoute,
    getUserByIdRoute,
    updateUserMeRoute,
    updateUserByIdRoute,
    deleteUserByIdRoute
 } from "./schema";
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


export const userRouter = new OpenAPIHono<AppContext>()
    .openapi(createUserRoute, createUserService)
    .openapi(listUsersRoute, listUsersService)
    .openapi(getUserMeRoute, getUserMeService)
    .openapi(getUserByIdRoute, getUserByIdService)
    .openapi(updateUserMeRoute, updateUserMeService)
    .openapi(updateUserByIdRoute, updateUserByIdService)
    .openapi(deleteUserByIdRoute, deleteUserByIdService)
    .route("/", userRoleRouter);
