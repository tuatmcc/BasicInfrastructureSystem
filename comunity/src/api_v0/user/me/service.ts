import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../core/types";
import { getUserMeRoute, updateUserMeRoute } from "./schema";
import { eq } from "drizzle-orm";
import { users } from "../../../../../share/drizzle/schema";

export const getUserMeService: RouteHandler<typeof getUserMeRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const appUser = c.get("appUser");

    // DBから自身の情報を取得 (Discord IDで検索)
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, appUser.id))
        .limit(1);

    if (!user) {
        return c.json({ error: "User not found in database" }, 404);
    }

    return c.json(user, 200);
};

export const updateUserMeService: RouteHandler<typeof updateUserMeRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");
    
    // 別のモックデータを返す
    const mockUpdatedUser = {
        id: "d83f3347-888a-4b9e-9c99-24ebeadf1b60",
        discordUserId: "1501602493606662264",
        displayName: "John Doe",
        memberId: "ed55db90-f5b1-488d-be10-558c12de30e6",
        authId: "6ab5e204-7f19-4d03-aa41-485fd78b97ed"
    };

    return c.json(mockUpdatedUser, 200);
};
