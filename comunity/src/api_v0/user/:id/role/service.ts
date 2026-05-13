import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../../core/types";
import { getUserRolesByIdRoute, updateUserRolesRoute } from "./schema";
import { HTTPException } from "hono/http-exception";

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

export const updateUserRolesService: RouteHandler<typeof updateUserRolesRoute, AppContext> = async (c) => {
    const user = c.get("appUser");
    if (user.role !== "admin") throw new HTTPException(403);
    const mockRole = { roleId: "r-123", roleName: "admin" };
    return c.json([mockRole], 200);
};
