import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppContext } from "../../core/types";
import { 
    createGradesService,
    getGradesService,
    updateGradesService,
    deleteGradeService
} from "./service";

import {
    createGradeRoute,
    getGradesRoute,
    updateGradesRoute,
    deleteGradeRoute
} from "./schema"


// --- api ---

export const gradeRouter = new OpenAPIHono<AppContext>()
    .openapi(getGradesRoute, getGradesService)
    .openapi(updateGradesRoute, updateGradesService)
    .openapi(createGradeRoute, createGradesService)
    .openapi(deleteGradeRoute, deleteGradeService)
