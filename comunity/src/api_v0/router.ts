import { OpenAPIHono } from "@hono/zod-openapi"
import { AppContext } from "../core/types"
import { userRouter } from "./user/router"
import { roleRouter } from "./role/router"
import { channelRouter } from "./channel/router"
import { categoryRouter } from "./category/router"
import { messageRouter } from "./message/router"

export const apiv0Router = new OpenAPIHono<AppContext>()
    .route("/user", userRouter)
    .route("/role", roleRouter)
    .route("/channel", channelRouter)
    .route("/category", categoryRouter)
    .route("/message", messageRouter)
