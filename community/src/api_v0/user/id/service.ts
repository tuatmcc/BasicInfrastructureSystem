import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../core/types";
import { getUserByIdRoute, updateUserByIdRoute, deleteUserByIdRoute } from "./schema";
import { user } from "../../../../../share/drizzle/schema";
import { eq } from "drizzle-orm";

export const getUserByIdService: RouteHandler<typeof getUserByIdRoute, AppContext> = async (c) => {
    const userId = c.req.param("id");
    if (!userId) {
        return c.json({ message: "User ID is required" }, 401);
    }
    const db = c.get("db");
    const result = await db.select().from(user).where(eq(user.id, userId)).limit(1);

    if (result.length === 0) {
        return c.json({ message: "User not found" }, 401);
    }

    return c.json(result[0], 200);
};

export const updateUserByIdService: RouteHandler<typeof updateUserByIdRoute, AppContext> = async (c) => {
    const userId = c.req.param("id");
    if (!userId) {
        return c.json({ message: "User ID is required" }, 401);
    }
    const db = c.get("db");
    const body = c.req.valid("json");

    const updated = await db.update(user)
        .set({
            ...body,
            updatedAt: new Date()
        })
        .where(eq(user.id, userId))
        .returning();

    if (updated.length === 0) {
        return c.json({ message: "User not found" }, 401);
    }

    return c.json(updated[0], 200);
};

export const deleteUserByIdService: RouteHandler<typeof deleteUserByIdRoute, AppContext> = async (c) => {
    const userId = c.req.param("id");
    if (!userId) {
        return c.body(null, 204);
    }
    const db = c.get("db");
    await db.delete(user).where(eq(user.id, userId));

    return c.body(null, 204);
};
