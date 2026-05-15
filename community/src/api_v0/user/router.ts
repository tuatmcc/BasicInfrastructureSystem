import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";

import { createUserRoute, listUsersRoute } from "./schema";
import { createUserService, listUsersService } from "./service";
import { userMeRouter } from "./me/router";
import { userDetailRouter } from "./:id/router";

// ***** user router *****
// /api/v0/user
export const userRouter = new OpenAPIHono<AppContext>()
    // 1. コレクション操作 (/api/v0/user/)
    .openapi(createUserRoute, createUserService)
    .openapi(listUsersRoute, listUsersService)
    
    // 2. 自身の情報 (/api/v0/user/me/**)
    .route("/me", userMeRouter)
    
    // 3. 個別ユーザーの情報 (/api/v0/user/:id/**)
    // .route("/:id{[0-9]+|[0-9a-fA-F\\-]{36}}", userDetailRouter);
