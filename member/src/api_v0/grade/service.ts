import { AppContext } from "../../core/types"
import { RouteHandler } from "@hono/zod-openapi"
import {
    createGradeRoute,
    getGradesRoute,
    updateGradesRoute,
    deleteGradeRoute
} from "./schema"
import { grades } from "../../../../share/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const createGradesService: RouteHandler<typeof createGradeRoute, AppContext> = async (c) => {
    if ("admin" !== c.get("appUser").role) {
        return c.json(null, 403)
    }

    const createdGrades = await c.get("db").transaction((tx) => tx
        .insert(grades)
        .values(c.req.valid("json"))
        .returning())

    return c.json(createdGrades[0], 201);
};

export const getGradesService: RouteHandler<typeof getGradesRoute, AppContext> = async (c) => {
    const result = await c.get("db").transaction((tx) => tx.select().from(grades));
    return c.json(result, 200);
};

export const updateGradesService: RouteHandler<typeof updateGradesRoute, AppContext> = async (c) => {
    if ("admin" !== c.get("appUser").role) {
        return c.json(null, 403)
    }

    const { id } = c.req.valid("param");
    const updatedGrades = await c.get("db").transaction((tx) => tx.update(grades)
        .set({
            ...c.req.valid("json"),
            updatedAt: sql`now()`
        })
        .where(eq(grades.id, id))
        .returning());

    if (updatedGrades.length === 0) {
        return c.json(null, 404);
    }

    return c.json(updatedGrades[0], 200);
};

export const deleteGradeService: RouteHandler<typeof deleteGradeRoute, AppContext> = async (c) => {
    if ("admin" !== c.get("appUser").role) {
        return c.json(null, 403)
    }

    const { id } = c.req.valid("param");
    const result = await c.get("db").transaction((tx) => tx
        .delete(grades)
        .where(eq(grades.id, id))
        .returning());

    if (result.length === 0) {
        return c.json(null, 404);
    }

    return c.body(null, 204);
};
