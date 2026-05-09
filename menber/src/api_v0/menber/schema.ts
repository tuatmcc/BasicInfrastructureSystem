import { z } from "@hono/zod-openapi"
import { createRoute } from "@hono/zod-openapi";
import { createSelectSchema, createInsertSchema } from "drizzle-zod"
import { members } from "../../../../share/drizzle/schema"
import { createUpdateSchema } from "drizzle-zod";

export const MemberSchema = createSelectSchema(members).extend({
    displayGrade: z.string().optional().openapi({ example: 'B1' })
}).openapi("Member")

export const CreateMenberSchema = createInsertSchema(members).omit({memberId:true ,createdAt:true,updatedAt:true}).openapi("CreateMenber");


export const UpdateMemberSchema = createUpdateSchema(members).partial().openapi("UpdateMemberRequest")


// create
// admin のみ
export const createMenberRoute = createRoute({
    method: 'post',
    path: '/',
    request:{
        body:{
            content:{
                "application/json":{
                    schema: CreateMenberSchema
                }
            }
        }
    },
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
export const getMenberRoute = createRoute({
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

// // admin のみ 
// // id での取得
// export const getMenbersByIdRoute = createRoute({
//     method: 'get',
//     path: '/',
//     request: {
//         params: z.object({
//             id: z.string().openapi({ example: 'user-123' }).array(),
//         }),
//     },
//     responses: {
//         200: {
//             description: 'ユーザー情報の取得に成功',
//             content: {
//                 'application/json': {
//                     schema: MemberSchema.array(),
//                 },
//             },
//         },
//         403: {
//             description: '権限がありません',
//         },
//         404: {
//             description: 'ユーザーが見つからない',
//         },
//     },
// })

// // 条件付き一括取得　admin のみ
// export const getMenbersByConditionRoute = createRoute({
//     method: 'get',
//     path: '/',
//     request: {
//         query: z.object({
//             gradeup: z.string().optional().openapi({ example: '2019' }),
//             gradedown: z.string().optional().openapi({ example: '2025' }),
//         }),
//     },
//     responses: {
//         200: {
//             description: 'ユーザー一覧の取得に成功',
//             content: {
//                 'application/json': {
//                     schema: MemberSchema.array(),
//                 },
//             },
//         },
//         403: {
//             description: '権限がありません',
//         },
//     },
// })

// update
// 自分自身の情報の更新
export const updateMenberRoute = createRoute({
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
export const updateMenberByIdRoute = createRoute({
    method: 'put',
    path:'/:id',
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
export const deleteMenberRoute = createRoute({
    method: 'delete',
    path: '/:id',
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