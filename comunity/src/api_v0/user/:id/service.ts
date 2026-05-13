import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../../core/types";
import { getUserByIdRoute, updateUserByIdRoute, deleteUserByIdRoute } from "./schema";

export const getUserByIdService: RouteHandler<typeof getUserByIdRoute, AppContext> = async (c) => {
    // Mock
    return c.json(c.get("appUser"), 200);
};

export const updateUserByIdService: RouteHandler<typeof updateUserByIdRoute, AppContext> = async (c) => {
    // Mock
    return c.json(c.get("appUser"), 200);
};

export const deleteUserByIdService: RouteHandler<typeof deleteUserByIdRoute, AppContext> = async (c) => {
    return c.json(undefined, 204);
};
