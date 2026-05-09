import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { MemberSchema, UpdateMemberSchema } from "./schema";
import type { AppContext } from "../../core/types";
import { 
    createMenberService,
    getMenberService,
    // getMenbersByIdService,
    // getMenbersByConditionService,
    updateMenberService,
    updateMenberByIdService,
    deleteMenberService 
} from "./service";

import {
    createMenberRoute,
    getMenberRoute,
    // getMenbersByIdRoute,
    // getMenbersByConditionRoute,
    updateMenberRoute,
    updateMenberByIdRoute,
    deleteMenberRoute
} from "./schema"

// ***** users *****
// ユーザー情報の管理
// 基本は / を使用して自分自身の情報を操作する
// 管理者(admin)のみが param idを渡して を使用して他者の情報を操作できる
// path: /users
// *****************


// --- api ---

export const userRouter = new OpenAPIHono<AppContext>()
    .openapi(getMenberRoute, getMenberService)
    .openapi(updateMenberRoute, updateMenberService)
    .openapi(createMenberRoute, createMenberService)
    // .openapi(getMenbersByIdRoute, getMenbersByIdService)
    // .openapi(getMenbersByConditionRoute, getMenbersByConditionService)
    .openapi(updateMenberByIdRoute, updateMenberByIdService)
    .openapi(deleteMenberRoute, deleteMenberService)


