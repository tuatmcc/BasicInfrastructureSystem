import { z } from '@hono/zod-openapi'
import { createRoute } from "@hono/zod-openapi";

export const categorySchema = z.object({
    category_id: z.uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    category_name: z.string().openapi({ example: 'General' }),
}).openapi('Category')

export const createCategorySchema = z.object({
    // category_id: z.uuid().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    category_name: z.string().openapi({ example: 'General' }),
}).openapi('CreateCategoryRequest')

export const updateCategorySchema = z.object({
    category_name: z.string().optional().openapi({ example: 'New Name' }),
}).openapi('UpdateCategoryRequest')


// create
export const createCategoryRoute = createRoute({
    method: "post",
    path: "/",
    request: { body: { 
        content: { 
            "application/json": { 
                schema: createCategorySchema 
            } } } },
    responses: { 201: { description: "成功" } }
});

// read
export const listCategoriesRoute = createRoute({
    method: "get",
    path: "/",
    responses: { 200: { description: "成功", content: { "application/json": { schema: categorySchema.array() } } } }
});

export const getCategoryByIdRoute = createRoute({
    method: "get",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: "成功", content: { "application/json": { schema: categorySchema } } } }
});

// update
export const updateCategoryRoute = createRoute({
    method: "put",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: updateCategorySchema } } } },
    responses: { 200: { description: "成功", content: { "application/json": { schema: categorySchema } } } }
});

// delete
export const deleteCategoryRoute = createRoute({
    method: "delete",
    path: "/{id}",
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: "成功" } }
})