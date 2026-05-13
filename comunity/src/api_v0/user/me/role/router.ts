import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../../../core/types";
import { getUserMeRolesRoute } from "./schema";
import { getUserMeRolesService } from "./service";

export const userMeRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(getUserMeRolesRoute, getUserMeRolesService);
