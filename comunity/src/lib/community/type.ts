import { z } from 'zod';

// --- Category Schemas ---
export const CreateCategoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.number().optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number().default(0),
});
export type Category = z.infer<typeof CategorySchema>;