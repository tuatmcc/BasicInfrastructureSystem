import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../../core/types";
import { getUserMeRoute, updateUserMeRoute } from "./schema";
import { getUserMeService, updateUserMeService } from "./service";
import { userIdentityRouter } from "./identity/router";
// import { userMeRoleRouter } from "./role/router";

export const userMeRouter = new OpenAPIHono<AppContext>()
    .openapi(getUserMeRoute, getUserMeService)
    .openapi(updateUserMeRoute, updateUserMeService)
    .route("/identities", userIdentityRouter)
    // .route("/role", userMeRoleRouter);
