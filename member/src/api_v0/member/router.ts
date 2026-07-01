import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { MemberSchema, UpdateMemberSchema } from "./schema";
import type { AppContext } from "../../core/types";
import { 
    createMemberService,
    getMemberService,
    joinMemberService,
    // getMembersByIdService,
    // getMembersByConditionService,
    updateMemberService,
    updateMemberByIdService,
    deleteMemberService,
    getMembersByIdsService
} from "./service";

import {
    createMemberRoute,
    getMemberRoute,
    joinMemberRoute,
    // getMembersByIdRoute,
    // getMembersByConditionRoute,
    updateMemberRoute,
    updateMemberByIdRoute,
    deleteMemberRoute,
    getMembersByIdsRoute
} from "./schema"

// ***** users *****
// ユーザー情報の管理
// 基本は / を使用して自分自身の情報を操作する
// 管理者(admin)のみが param idを渡して を使用して他者の情報を操作できる
// path: /users
// *****************


// --- api ---

export const userRouter = new OpenAPIHono<AppContext>()
    .openapi(getMemberRoute, getMemberService)
    .openapi(updateMemberRoute, updateMemberService)
    .openapi(joinMemberRoute, joinMemberService)
    .openapi(createMemberRoute, createMemberService)
    // .openapi(getMembersByIdRoute, getMembersByIdService)
    // .openapi(getMembersByConditionRoute, getMembersByConditionService)
    .openapi(updateMemberByIdRoute, updateMemberByIdService)
    .openapi(deleteMemberRoute, deleteMemberService)
    .openapi(getMembersByIdsRoute, getMembersByIdsService)

