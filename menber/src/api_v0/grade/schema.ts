import { z } from "@hono/zod-openapi"
import { createRoute } from "@hono/zod-openapi";
import { createSelectSchema, createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { grades } from "../../../../share/drizzle/schema"

export const GradesSchema = createSelectSchema(grades).openapi("Grade")

// IDとタイムスタンプはDBで自動生成されるため、挿入スキーマからは除外
export const CreateGradeSchema = createInsertSchema(grades)
  .omit({  createdAt: true, updatedAt: true })
  .openapi("CreateGrade");

// IDは更新せず、タイムスタンプも自動更新を想定して除外
export const UpdateGradeSchema = createUpdateSchema(grades)
  .omit({ createdAt: true, updatedAt: true })
  .partial()
  .openapi("UpdateGrade")

// パスパラメータ用のIDスキーマ
const ParamsSchema = z.object({
    id: z.coerce.number().openapi({
        param: {
            name: 'id',
            in: 'path',
        },
        example: 1,
    }),
});


// create
// admin のみ
export const createGradeRoute = createRoute({
    method: 'post',
    path: '/',
    request:{
        body:{
            content:{
                "application/json":{
                    schema: CreateGradeSchema
                }
            }
        }
    },
    responses: {
        201: {
            description: 'Gradeの作成に成功',
            content: {
                'application/json': {
                    schema: GradesSchema,
                },
            },
        },
        400: {
            description: 'リクエストが不正',
        },
        403: {
            description: '権限がありません',
        },
    },
});


// read 
// grades 一覧
export const getGradesRoute = createRoute({
    method: 'get',
    path: '/',
    responses: {
        200: {
            description: '成功',
            content: {
                'application/json': {
                    schema: GradesSchema.array(),
                },
            },
        },
        401: {
            description: '認証エラー',
        },
    },
})


// update
// gradeカラム自体の更新　admin
export const updateGradesRoute = createRoute({
    method: 'put',
    path:'/:id',
    request: {
        params: ParamsSchema,
        body: {
            content: {
                'application/json': {
                    schema: UpdateGradeSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Gradeの更新に成功',
            content: {
                'application/json': {
                    schema: GradesSchema,
                },
            },
        },
        400: {
            description: 'リクエストが不正',
        },
        401: {
            description: '認証エラー',
        },
        404: {
            description: 'Gradeが見つからない',
        },
    },
})


// delete (admin only)
export const deleteGradeRoute = createRoute({
    method: 'delete',
    path: '/:id',
    request: {
        params: ParamsSchema,
    },
    responses: {
        204: {
            description: 'Gradeの削除に成功',
        },
        403: {
            description: '権限がありません',
        },
        404: {
            description: 'Gradeが見つからない',
        },
    },
})