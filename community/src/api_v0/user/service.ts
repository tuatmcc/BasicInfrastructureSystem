import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../core/types";
import { createUserRoute, listUsersRoute } from "./schema";
import { user } from "../../../../share/drizzle/schema";

export const createUserService: RouteHandler<typeof createUserRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");
    const body = c.req.valid("json");
    const now = new Date();

    if (appUser.role !== "admin") {
        return c.json({ message: "Forbidden" }, 403);
    }

    const [createdUser] = await db
        .insert(user)
        .values({
            ...body,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        })
        .returning();

    return c.json(createdUser, 201);
};

export const listUsersService: RouteHandler<typeof listUsersRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");

    if (appUser.role !== "admin") {
        return c.json({ message: "Forbidden" }, 403);
    }

    const users = await db.select().from(user);

    return c.json(users, 200);
};
