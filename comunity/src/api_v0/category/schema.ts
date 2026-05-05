import { z } from '@hono/zod-openapi'

export const categorySchema = z.object({
    category_id: z.string().openapi({ example: 'cat-123' }),
    category_name: z.string().openapi({ example: 'General' }),
}).openapi('Category')

export const createCategorySchema = z.object({
    category_id: z.string().openapi({ example: 'cat-123' }),
    category_name: z.string().openapi({ example: 'General' }),
}).openapi('CreateCategoryRequest')

export const updateCategorySchema = z.object({
    category_name: z.string().optional().openapi({ example: 'New Name' }),
}).openapi('UpdateCategoryRequest')
