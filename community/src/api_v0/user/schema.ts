import { createRoute, z } from "@hono/zod-openapi";
import { user } from "../../../../share/drizzle/schema";
import { createSelectSchema, createInsertSchema } from "drizzle-zod"

export const createUserSchema = createInsertSchema(user)
    .omit({ id: true, createdAt: true, updatedAt: true })
    .openapi("CreateUserRequest")

export const getUserSchema = createSelectSchema(user).openapi("User")

export const UpdateUserSchema = createInsertSchema(user)
    .omit({ id: true, createdAt: true, updatedAt: true })
    .partial()
    .openapi("UpdateUserRequest")

export const UpdateUserMeSchema = z.object({
    name: z.string().optional(),
    displayName: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    discordUserId: z.string().nullable().optional(),
}).openapi("UpdateUserMeRequest")

const errorMessageSchema = z.object({ message: z.string() });


// create
// ユーザーを新規作成する
export const createUserRoute = createRoute({
    method: "post",
    path: "/",
    request:{
        body:{
            content:{
                "application/json":{
                    schema: createUserSchema
                }
            }
        }
    },
    responses: { 
        201: { description: "成功", content: { "application/json": { schema: getUserSchema } } },
        401: { description: "Unauthorized", content: { "application/json": { schema: errorMessageSchema } } },
        403: { description: "Forbidden", content: { "application/json": { schema: errorMessageSchema } } }
    }
});

// read
// ユーザー一覧を取得する
export const listUsersRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 
        200: { description: "成功", content: { "application/json": { schema: getUserSchema.array() } } } ,
        401: { description: "Unauthorized", content: { "application/json": { schema: errorMessageSchema } } },
        403: { description: "Forbidden", content: { "application/json": { schema: errorMessageSchema } } }
    }

});
