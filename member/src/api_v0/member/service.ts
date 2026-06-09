import { AppContext } from "../../core/types"
import { RouteHandler } from "@hono/zod-openapi"
import { createMemberRoute, 
    getMemberRoute, 
    updateMemberRoute,
    updateMemberByIdRoute,
    deleteMemberRoute,
    getMembersByIdsRoute
 } from "./schema";
import { members, user, grades } from "../../../../share/drizzle/schema";
import { eq, sql, getTableColumns, inArray } from "drizzle-orm";

export const createMemberService:RouteHandler<typeof createMemberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser || "admin" !== appUser.role) {
        return c.json(null, 403);
    }

    const createdMember = await c.get("db").insert(members).values(c.req.valid("json")).returning();

    return c.json(createdMember[0], 201);
};

export const getMemberService:RouteHandler<typeof getMemberRoute,AppContext> = async (c) => {
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

export const updateMemberService:RouteHandler<typeof updateMemberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) return c.json(null, 401);
    const userId = appUser.id;
    const db = c.get("db");

    const users = await db.select({ memberId: user.memberId }).from(user).where(eq(user.id, userId)).limit(1);
    
    if (users.length === 0 || !users[0].memberId) {
        return c.json(null, 401);
    }

    const updatedMember = await db.update(members)
        .set({
            ...c.req.valid("json"),
            updatedAt: sql`now()`
        })
        .where(eq(members.memberId, users[0].memberId))
        .returning();

    if (updatedMember.length === 0) {
        return c.json(null, 401);
    }

    return c.json(updatedMember[0], 200);
};

export const updateMemberByIdService:RouteHandler<typeof updateMemberByIdRoute,AppContext>  = async (c) => {
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

export const deleteMemberService:RouteHandler<typeof deleteMemberRoute,AppContext>  = async (c) => {
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

    const db = c.get("db");
    const query = db.select({
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
    .leftJoin(grades, eq(members.grade, grades.id));

    const result = idList.length > 0
        ? await query.where(inArray(members.memberId, idList))
        : await query;

    return c.json(result, 200);
};


