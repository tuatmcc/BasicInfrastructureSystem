import { OpenAPIHono } from "@hono/zod-openapi"
import { AppContext } from "../core/types"

import { userRouter } from './member/router'
import { gradeRouter } from './grade/router'

export const apiv0Router = new OpenAPIHono<AppContext>()
    .route("/member", userRouter)
    .route("/grade", gradeRouter)
