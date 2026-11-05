import { can } from "../../../../share/permissions";
import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../core/types";
import { createUserRoute, listUsersRoute } from "./schema";
import { user } from "../../../../share/drizzle/schema";

export const createUserService: RouteHandler<typeof createUserRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");
    const body = c.req.valid("json");
    const now = new Date();

    if (!can(appUser.permissions, "member.edit")) {
        return c.json({ message: "Forbidden" }, 403);
    }

    const [createdUser] = await db.transaction((tx) => tx
        .insert(user)
        .values({
            ...body,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        })
        .returning());

    return c.json(createdUser, 201);
};

export const listUsersService: RouteHandler<typeof listUsersRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");

    if (!can(appUser.permissions, "member.read_private")) {
        return c.json({ message: "Forbidden" }, 403);
    }

    const users = await db.transaction((tx) => tx.select().from(user));

    return c.json(users, 200);
};
