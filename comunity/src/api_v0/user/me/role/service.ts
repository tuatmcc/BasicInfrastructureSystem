import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../../core/types";
import { getUserMeRolesRoute } from "./schema";

export const getUserMeRolesService: RouteHandler<typeof getUserMeRolesRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");
    // if (!appUser) return c.json({ error: "Unauthorized: User not found in context" }, 401);

    const userId = appUser.discordid;
    if (!userId) return c.json({ error: "Discord User ID not found" }, 404);

    const discordRoles = await c.get("community").listUserRoles(userId);
    const roles = discordRoles.map(r => ({
        roleId: r.id,
        roleName: r.name
    }));

    return c.json(roles, 200);
};
