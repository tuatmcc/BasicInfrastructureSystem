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
    const appUser = c.get("appUser");
    
    // 別のモックデータを返す
    const mockUpdatedUser = {
        id: "d83f3347-888a-4b9e-9c99-24ebeadf1b60",
        discordUserId: "1501602493606662264",
        displayName: "John Doe",
        memberId: "ed55db90-f5b1-488d-be10-558c12de30e6",
        name: "John Doe",
        email: "john@example.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    return c.json(mockUpdatedUser as any, 200);
};
