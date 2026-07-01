import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";
import {
    createMessageService,
    getMessageReactionsService,
    getMessageService,
    listMessagesService
} from "./service";
import {
    createMessageRoute,
    getMessageReactionsRoute,
    getMessageRoute,
    listMessagesRoute
} from "./schema";


export const messageRouter = new OpenAPIHono<AppContext>()
    .openapi(createMessageRoute, createMessageService)
    .openapi(listMessagesRoute, listMessagesService)
    .openapi(getMessageRoute, getMessageService)
    .openapi(getMessageReactionsRoute, getMessageReactionsService);
