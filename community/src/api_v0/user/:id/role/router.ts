import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../../../core/types";
import { getUserRolesByIdRoute, updateUserRolesRoute } from "./schema";
import { getUserRolesByIdService, updateUserRolesService } from "./service";

export const userDetailRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(getUserRolesByIdRoute, getUserRolesByIdService)
    .openapi(updateUserRolesRoute, updateUserRolesService);
