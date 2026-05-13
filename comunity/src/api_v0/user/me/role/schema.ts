import { createRoute, z } from "@hono/zod-openapi";
import { roles } from "../../../../../../share/drizzle/schema";
import { createSelectSchema } from "drizzle-zod"

export const roleSchema = createSelectSchema(roles).openapi("Role")

export const getUserMeRolesRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 
        200: { description: "成功", content: { "application/json": { schema: roleSchema.array() } } },
        404: { description: "Not Found", content: { "application/json": { schema: z.object({ error: z.string() }) } } },
        401: { description: "Not Found", content: { "application/json": { schema: z.object({ error: z.string() }) } } }
    }
})