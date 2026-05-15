import { createRoute, z } from "@hono/zod-openapi";
import { users } from "../../../../share/drizzle/schema";
import { createSelectSchema, createInsertSchema } from "drizzle-zod"

export const createUserSchema = createInsertSchema(users).omit({ id: true }).openapi("CreateUserRequest")

export const getUserSchema = createSelectSchema(users).openapi("User")

export const UpdateUserSchema = createInsertSchema(users).omit({id:true}).partial().openapi("UpdateUserRequest")


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
        401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ message: z.string() }) } } }
    }
});

// read
// ユーザー一覧を取得する
export const listUsersRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 
        200: { description: "成功", content: { "application/json": { schema: getUserSchema.array() } } } ,
        401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ message: z.string() }) } } }
    }

});
