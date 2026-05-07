import type { Context } from "hono"
import { AppContext } from "../../core/types"

import { RouteHandler } from "@hono/zod-openapi"
import { createMenberRoute, 
    getMenberRoute, 
    // getMenbersByIdRoute,
// getMenbersByConditionRoute,
updateMenberRoute,
updateMenberByIdRoute,
deleteMenberRoute
 } from "./schema";
import { members, users } from "../../../../share/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const createMenberServicet:RouteHandler<typeof createMenberRoute,AppContext> = async (c) => {
    if( "admin" !== c.get("appUser").role){
        return c.json(null, 403)
    }

    const createdMenber = await c.get("db").insert(members).values(c.req.valid("json")).returning()

    return c.json(createdMenber[0], 201);
};

export const getMenberService:RouteHandler<typeof getMenberRoute,AppContext> = async (c) => {
    const userId = c.get("appUser").id;

    const result = await c.get("db").select({
        member: members
    }).from(members).innerJoin(users,eq(members.memberId,users.memberId)).where(eq(users.id,userId));

    if (result.length === 0) {
        return c.json(null, 401); // スキーマに合わせて 401 または 404
    }

    return c.json(result[0].member, 200);
};

// export const getMenbersByIdService:RouteHandler<typeof getMenbersByIdRoute,AppContext>  = async (c) => {
//     if( "admin" !== c.get("appUser").role){
//         return c.json(null,403)
//     }
    
//     const id = c.req.param("id");
//     return c.json([mockMember], 200);
// }

// export const getMenbersByConditionService :RouteHandler<typeof getMenbersByConditionRoute,AppContext> = async (c) => {
//     const user = c.get("appUser");
//     if (user.role !== "admin") {
//         throw new HTTPException(403, { message: "Forbidden" });
//     }
//     return c.json([mockMember], 200);
// }

export const updateMenberService:RouteHandler<typeof updateMenberRoute,AppContext> = async (c) => {
    const userId = c.get("appUser").id;
    const db = c.get("db");

    const updatedMenber = await db.update(members)
        .set({
            ...c.req.valid("json"),
            updatedAt: sql`now()`
        })
        .where(eq(members.memberId, 
            db.select({ memberId: users.memberId })
              .from(users)
              .where(eq(users.id, userId))
        ))
        .returning();

    if (updatedMenber.length === 0) {
        return c.json(null, 401); // 自分自身が見つからない＝認証/マッピングエラー
    }

    return c.json(updatedMenber[0], 200);
};

export const updateMenberByIdService:RouteHandler<typeof updateMenberByIdRoute,AppContext>  = async (c) => {
    if( "admin" !== c.get("appUser").role){
        return c.json(null, 403)
    }

    const id = c.req.param("id");
    
    const updated = await c.get("db").update(members)
        .set({
            ...c.req.valid("json"),
            updatedAt: sql`now()`
        })
        .where(eq(members.memberId, id))
        .returning();

    if (updated.length === 0) {
        return c.json(null, 404);
    }

    return c.json(updated[0], 200);
}

export const deleteUserService:RouteHandler<typeof deleteMenberRoute,AppContext>  = async (c) => {
    if( "admin" !== c.get("appUser").role){
        return c.json(null, 403)
    }

    const id = c.req.param("id");
    const result = await c.get("db").delete(members).where(eq(members.memberId, id)).returning();

    if (result.length === 0) {
        return c.json(null, 404);
    }

    return c.body(null, 204);
};