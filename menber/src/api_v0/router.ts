import { OpenAPIHono } from "@hono/zod-openapi"
import { AppContext } from "../core/types"

import { userRouter } from './menber/router'
import { gradeRouter } from './grade/router'

export const apiv0Router = new OpenAPIHono<AppContext>()
    .route("/menber", userRouter)
    .route("/grade", gradeRouter)
