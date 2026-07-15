import { AppContext } from "../../core/types"
import { RouteHandler } from "@hono/zod-openapi"
import { createMemberRoute, 
    getMemberRoute, 
    joinMemberRoute,
    updateMemberRoute,
    updateMemberByIdRoute,
    deleteMemberRoute,
    getMembersByIdsRoute
 } from "./schema";
import { members, user, grades } from "../../../../share/drizzle/schema";
import { and, eq, sql, inArray, isNull } from "drizzle-orm";

class MemberJoinConflictError extends Error {
    constructor() {
        super("Member is already linked to this user");
        this.name = "MemberJoinConflictError";
    }
}

export const createMemberService:RouteHandler<typeof createMemberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser || "admin" !== appUser.role) {
        return c.json(null, 403);
    }

    const createdMember = await c.get("db").insert(members).values(c.req.valid("json")).returning();

    return c.json(createdMember[0], 201);
};

export const joinMemberService: RouteHandler<typeof joinMemberRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const db = c.get("db");
    if (appUser.memberId) {
        return c.json({ error: "Already joined" }, 409);
    }

    const memberId = crypto.randomUUID();

    try {
        const createdMember = await db.transaction(async (tx) => {
            // INSERT ... RETURNING is also checked by the members SELECT policy.
            // Mark only this server-generated UUID as the current member for this transaction.
            await tx.execute(sql`
                select set_config('app.current_member_id', ${memberId}, true)
            `);

            const [member] = await tx
                .insert(members)
                .values({
                    ...c.req.valid("json"),
                    memberId,
                })
                .returning();

            const linkedUsers = await tx
                .update(user)
                .set({
                    memberId,
                    updatedAt: new Date(),
                })
                .where(and(eq(user.id, appUser.id), isNull(user.memberId)))
                .returning({ id: user.id });

            if (linkedUsers.length !== 1) {
                throw new MemberJoinConflictError();
            }

            return member;
        });

        return c.json(createdMember, 201);
    } catch (error) {
        if (error instanceof MemberJoinConflictError) {
            return c.json({ error: "Already joined" }, 409);
        }
        throw error;
    }
};

export const getMemberService:RouteHandler<typeof getMemberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) return c.json(null, 401);
    const db = c.get("db");

    if (!appUser.memberId) {
        return c.json(null, 401);
    }

    const result = await db.select().from(members)
    .where(eq(members.memberId, appUser.memberId));

    if (result.length === 0) {
        return c.json(null, 401); 
    }

    return c.json(result[0], 200);
};

export const updateMemberService:RouteHandler<typeof updateMemberRoute,AppContext> = async (c) => {
    const appUser = c.get("appUser");
    if (!appUser) return c.json(null, 401);
    const db = c.get("db");

    if (!appUser.memberId) {
        return c.json(null, 401);
    }

    const updatedMember = await db.update(members)
        .set({
            ...c.req.valid("json"),
            updatedAt: sql`now()`
        })
        .where(eq(members.memberId, appUser.memberId))
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
