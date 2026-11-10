import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../../../core/types";
import { getUserRolesByIdRoute } from "./schema";
import { getUserRolesByIdService } from "./service";

export const userDetailRoleRouter = new OpenAPIHono<AppContext>()
    .openapi(getUserRolesByIdRoute, getUserRolesByIdService);
