import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";
import { getGradesService } from "./service";

import { getGradesRoute } from "./schema"


// --- api ---

export const gradeRouter = new OpenAPIHono<AppContext>()
    .openapi(getGradesRoute, getGradesService)
