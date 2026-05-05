import { z } from '@hono/zod-openapi'

export const categorySchema = z.object({
    category_id: z.uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    category_name: z.string().openapi({ example: 'General' }),
}).openapi('Category')

export const createCategorySchema = z.object({
    category_id: z.uuid().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    category_name: z.string().openapi({ example: 'General' }),
}).openapi('CreateCategoryRequest')

export const updateCategorySchema = z.object({
    category_name: z.string().optional().openapi({ example: 'New Name' }),
}).openapi('UpdateCategoryRequest')
