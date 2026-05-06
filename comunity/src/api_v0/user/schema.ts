import { createRoute, z } from "@hono/zod-openapi";
import { users } from "../../../drizzle/schema";
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

// 自身の情報を取得する
export const getUserMeRoute = createRoute({
    method: "get",
    path: "/me",
    responses: { 200: { description: "成功", content: { "application/json": { schema: getUserSchema } } } }
});

// 特定ユーザーの情報を取得する
export const getUserByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: { params: z.object({ id: z.uuid() }) },
     responses: { 
        200: { description: "成功", content: { "application/json": { schema: getUserSchema } } } ,
        401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ message: z.string() }) } } }
    }
});

// update
// 自身の情報を更新する
export const updateUserMeRoute = createRoute({
    method: "put",
    path: "/me",
    request: { body: { content: { "application/json": { schema: UpdateUserSchema } } } },
    responses: { 200: { description: "成功", content: { "application/json": { schema: getUserSchema } } } }
});

// 特定ユーザーの情報を更新する
export const updateUserByIdRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: { params: z.object({ id: z.uuid() }), body: { content: { "application/json": { schema: UpdateUserSchema } } } },
    responses: { 
         200: { description: "成功", content: { "application/json": { schema: getUserSchema } } } ,
        401: { description: "Unauthorized", content: { "application/json": { schema: z.object({ message: z.string() }) } } }
     }
});

// delete
// 特定ユーザーを削除する
export const deleteUserByIdRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 204: { description: "成功" } }
});