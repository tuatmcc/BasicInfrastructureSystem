import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../../core/types";
import { getUserRolesByIdRoute } from "./schema";

export const getUserRolesByIdService: RouteHandler<typeof getUserRolesByIdRoute, AppContext> = async (c) => {
    const userId = c.req.param("id");
    if (!userId) return c.json({ error: "User ID not found" }, 404);

    const discordRoles = await c.get("community").listUserRoles(userId);
    const roles = discordRoles.map(r => ({
        roleId: r.id,
        roleName: r.name
    }));

    return c.json(roles, 200);
};
