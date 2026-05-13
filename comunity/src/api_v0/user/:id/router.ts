import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../../core/types";
import { getUserByIdRoute, updateUserByIdRoute, deleteUserByIdRoute } from "./schema";
import { getUserByIdService, updateUserByIdService, deleteUserByIdService } from "./service";
import { userDetailRoleRouter } from "./role/router";

export const userDetailRouter = new OpenAPIHono<AppContext>()
    .openapi(getUserByIdRoute, getUserByIdService)
    .openapi(updateUserByIdRoute, updateUserByIdService)
    .openapi(deleteUserByIdRoute, deleteUserByIdService)
    .route("/role", userDetailRoleRouter);
