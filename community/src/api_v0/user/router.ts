import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";

import { userMeRouter } from "./me/router";

// ***** user router *****
// /api/v0/user
export const userRouter = new OpenAPIHono<AppContext>()
    // Better Auth owns user/account lifecycle. The application exposes only
    // current-user presentation fields and explicit community identity linking.
    .route("/me", userMeRouter)
