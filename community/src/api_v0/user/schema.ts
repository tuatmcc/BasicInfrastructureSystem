import { createRoute, z } from "@hono/zod-openapi";
import { user } from "../../../../share/drizzle/schema";
import { createSelectSchema, createInsertSchema } from "drizzle-zod"

export const createUserSchema = createInsertSchema(user)
    .omit({ id: true, createdAt: true, updatedAt: true })
    .openapi("CreateUserRequest")

export const getUserSchema = createSelectSchema(user).openapi("User")

export const CurrentUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    memberId: z.string().uuid().nullable(),
    role: z.enum(["user", "admin"]),
}).openapi("CurrentUser")

// Better Auth owns identity, account linkage, member linkage, and application
// roles. This legacy admin endpoint may only edit the same presentation fields
// as the self-service endpoint; role/memberId changes remain explicit DB ops.
export const UpdateUserSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    image: z.string().nullable().optional(),
}).strict().openapi("UpdateUserRequest")

export const UpdateUserMeSchema = z.object({
    name: z.string().optional(),
    image: z.string().nullable().optional(),
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
