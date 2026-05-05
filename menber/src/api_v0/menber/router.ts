import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { MemberSchema, UpdateMemberSchema } from "./schema";
import type { AppContext } from "../../core/types";
import { 
    createMenberService,
    getMenberService,
    getMenbersByIdService,
    getMenbersByConditionService,
    updateMenberService,
    updateMenberByIdService,
    deleteUserService 
} from "./service";
import { memo } from "hono/jsx";

// ***** users *****
// ユーザー情報の管理
// 基本は / を使用して自分自身の情報を操作する
// 管理者(admin)のみが param idを渡して を使用して他者の情報を操作できる
// path: /users
// *****************

// create
// admin のみ
const createMenberRoute = createRoute({
    method: 'post',
    path: '/',
    responses: {
        201: {
            description: 'ユーザーの作成に成功',
            content: {
                'application/json': {
                    schema: MemberSchema,
                },
            },
        },
        400: {
            description: 'リクエストが不正',
        },
    },
});


// read 
const getMenberRoute = createRoute({
    method: 'get',
    path: '/',
    responses: {
        200: {
            description: '自身のユーザー情報の取得に成功',
            content: {
                'application/json': {
                    schema: MemberSchema,
                },
            },
        },
        401: {
            description: '認証エラー',
        },
    },
})

// admin のみ 
// id での取得
const getMenbersByIdRoute = createRoute({
    method: 'get',
    path: '/',
    request: {
        params: z.object({
            id: z.string().openapi({ example: 'user-123' }).array(),
        }),
    },
    responses: {
        200: {
            description: 'ユーザー情報の取得に成功',
            content: {
                'application/json': {
                    schema: MemberSchema.array(),
                },
            },
        },
        403: {
            description: '権限がありません',
        },
        404: {
            description: 'ユーザーが見つからない',
        },
    },
})

// 条件付き一括取得　admin のみ
const getMenbersByConditionRoute = createRoute({
    method: 'get',
    path: '/',
    request: {
        query: z.object({
            gradeup: z.string().optional().openapi({ example: '2019' }),
            gradedown: z.string().optional().openapi({ example: '2025' }),
        }),
    },
    responses: {
        200: {
            description: 'ユーザー一覧の取得に成功',
            content: {
                'application/json': {
                    schema: MemberSchema.array(),
                },
            },
        },
        403: {
            description: '権限がありません',
        },
    },
})

// update
// 自分自身の情報の更新
const updateMenberRoute = createRoute({
    method: 'put',
    path: '/',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UpdateMemberSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: '自身のユーザー情報の更新に成功',
            content: {
                'application/json': {
                    schema: MemberSchema,
                },
            },
        },
        400: {
            description: 'リクエストが不正',
        },
        401: {
            description: '認証エラー',
        },
    },
})

// admin のみ　id での更新
const updateMenberByIdRoute = createRoute({
    method: 'put',
    path:'/',
    request: {
        params: z.object({
            id: z.string().openapi({ example: 'user-123' }),
        }),
        body: {
            content: {
                'application/json': {
                    schema: UpdateMemberSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'ユーザー情報の更新に成功',
            content: {
                'application/json': {
                    schema: MemberSchema,
                },
            },
        },
        403: {
            description: '権限がありません',
        },
        400: {
            description: 'リクエストが不正',
        },
        404: {
            description: 'ユーザーが見つからない',
        },
    },
})

// delete (admin only)
const deleteMenberRoute = createRoute({
    method: 'delete',
    path: '/',
    request: {
        params: z.object({
            id: z.string().openapi({ example: 'user-123' }),
        }),
    },
    responses: {
        204: {
            description: 'ユーザーの削除に成功',
        },
        403: {
            description: '権限がありません',
        },
        404: {
            description: 'ユーザーが見つからない',
        },
    },
})

// --- api ---

export const userRouter = new OpenAPIHono<AppContext>()
    .openapi(getMenberRoute, getMenberService)
    .openapi(updateMenberRoute, updateMenberService)
    .openapi(createMenberRoute, createMenberService)
    .openapi(getMenbersByIdRoute, getMenbersByIdService)
    .openapi(getMenbersByConditionRoute, getMenbersByConditionService)
    .openapi(updateMenberByIdRoute, updateMenberByIdService)
    .openapi(deleteMenberRoute, deleteUserService)


