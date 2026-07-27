import { RouteHandler } from "@hono/zod-openapi";
import type { Context } from "hono";
import { AppContext } from "../../../core/types";
import { getUserMeRoute, updateUserMeRoute } from "./schema";
import { eq } from "drizzle-orm";
import { user } from "../../../../../share/drizzle/schema";

// The authentication store owns these. Membership and role are domain facts and
// come from the request's already-resolved account, so this service never
// reaches across the boundary.
const currentUserSelection = {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
};

const setPrivateNoStore = (c: Context<AppContext>) => {
    c.header('Cache-Control', 'private, no-store, max-age=0');
    c.header('Pragma', 'no-cache');
};

export const getUserMeService: RouteHandler<typeof getUserMeRoute, AppContext> = async (c) => {
    setPrivateNoStore(c);
    const db = c.get("db");
    const appUser = c.get("appUser");

    // DBから自身の情報を取得
    const [dbUser] = await db.transaction((tx) => tx
        .select(currentUserSelection)
        .from(user)
        .where(eq(user.id, appUser.id))
        .limit(1));

    if (!dbUser) {
        return c.json({ error: "User not found in database" }, 404);
    }

    return c.json({ ...dbUser, memberId: appUser.memberId, role: appUser.role }, 200);
};

export const updateUserMeService: RouteHandler<typeof updateUserMeRoute, AppContext> = async (c) => {
    setPrivateNoStore(c);
    const db = c.get("db");
    const appUser = c.get("appUser");
    const body = c.req.valid("json");

    const [updatedUser] = await db.transaction((tx) => tx
        .update(user)
        .set({
            ...body,
            updatedAt: new Date(),
        })
        .where(eq(user.id, appUser.id))
        .returning(currentUserSelection));

    if (!updatedUser) {
        return c.json({ error: "User not found in database" }, 404);
    }

    return c.json({ ...updatedUser, memberId: appUser.memberId, role: appUser.role }, 200);
};
