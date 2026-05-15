import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";
import { createMessageService } from "./service";
import { createMessageRoute } from "./schema";


export const messageRouter = new OpenAPIHono<AppContext>()
    .openapi(createMessageRoute, createMessageService);
