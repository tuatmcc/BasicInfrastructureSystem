import { AppContext } from "../../core/types"
import { RouteHandler } from "@hono/zod-openapi"
import { createMenberRoute, 
    getMenberRoute, 
    updateMenberRoute,
    updateMenberByIdRoute,
    deleteMenberRoute,
    getMembersByIdsRoute
 } from "./schema";
import { members, user, grades } from "../../../../share/drizzle/schema";
import { eq, sql, getTableColumns, inArray } from "drizzle-orm";

export const createMenberService:RouteHandler<typeof createMenberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser || "admin" !== appUser.role) {
        return c.json(null, 403);
    }

    const createdMenber = await c.get("db").insert(members).values(c.req.valid("json")).returning();

    return c.json(createdMenber[0], 201);
};

export const getMenberService:RouteHandler<typeof getMenberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) return c.json(null, 401);
    const userId = appUser.id;
    const db = c.get("db");

    const users = await db.select({ memberId: user.memberId }).from(user).where(eq(user.id, userId)).limit(1);

    if (users.length === 0 || !users[0].memberId) {
        return c.json(null, 401);
    }

    const result = await db.select().from(members)
    .where(eq(members.memberId, users[0].memberId));

    if (result.length === 0) {
        return c.json(null, 401); 
    }

    return c.json(result[0], 200);
};

export const updateMenberService:RouteHandler<typeof updateMenberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) return c.json(null, 401);
    const userId = appUser.id;
    const db = c.get("db");

    const users = await db.select({ memberId: user.memberId }).from(user).where(eq(user.id, userId)).limit(1);
    
    if (users.length === 0 || !users[0].memberId) {
        return c.json(null, 401);
    }

    const updatedMenber = await db.update(members)
        .set({
            ...c.req.valid("json"),
            updatedAt: sql`now()`
        })
        .where(eq(members.memberId, users[0].memberId))
        .returning();

    if (updatedMenber.length === 0) {
        return c.json(null, 401);
    }

    return c.json(updatedMenber[0], 200);
};

export const updateMenberByIdService:RouteHandler<typeof updateMenberByIdRoute,AppContext>  = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser || "admin" !== appUser.role) {
        return c.json(null, 403);
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

export const deleteMenberService:RouteHandler<typeof deleteMenberRoute,AppContext>  = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser || "admin" !== appUser.role) {
        return c.json(null, 403);
    }

    const id = c.req.param("id");
    const result = await c.get("db").delete(members).where(eq(members.memberId, id)).returning();

    if (result.length === 0) {
        return c.json(null, 404);
    }

    return c.body(null, 204);
};

export const getMembersByIdsService: RouteHandler<typeof getMembersByIdsRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) return c.json(null, 401);
    if ("admin" !== appUser.role) {
        return c.json(null, 403);
    }

    const { ids } = c.req.valid("json");
    const idList = ids.map(val => val.trim()).filter(val => val !== "");

    if (idList.length === 0) {
        return c.json([], 200);
    }

    const db = c.get("db");
    const result = await db.select({
        name: members.name,
        grade: members.grade,
        emergencyContact: members.emergencyContact,
        studentId: members.studentId,
        studentEmail: members.studentEmail,
        insurance: members.insurance,
        someAllergy: members.someAllergy,
        createdAt: members.createdAt,
        updatedAt: members.updatedAt,
        memberId: members.memberId,
        displayGrade: grades.displayGrade,
    }).from(members)
    .leftJoin(grades, eq(members.grade, grades.id))
    .where(inArray(members.memberId, idList));

    return c.json(result, 200);
};


