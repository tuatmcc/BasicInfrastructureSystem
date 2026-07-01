import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../core/types";
import { getUserMeRoute, updateUserMeRoute } from "./schema";
import { eq } from "drizzle-orm";
import { user } from "../../../../../share/drizzle/schema";

export const getUserMeService: RouteHandler<typeof getUserMeRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");

    // DBから自身の情報を取得
    const [dbUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, appUser.id))
        .limit(1);

    if (!dbUser) {
        return c.json({ error: "User not found in database" }, 404);
    }

    return c.json(dbUser, 200);
};

export const updateUserMeService: RouteHandler<typeof updateUserMeRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");
    const body = c.req.valid("json");

    const [updatedUser] = await db
        .update(user)
        .set({
            ...body,
            updatedAt: new Date(),
        })
        .where(eq(user.id, appUser.id))
        .returning();

    if (!updatedUser) {
        return c.json({ error: "User not found in database" }, 404);
    }

    return c.json(updatedUser, 200);
};
