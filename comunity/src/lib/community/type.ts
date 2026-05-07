import { z } from 'zod';

/*
community propiderの入出力スキーマ
変更不可
する場合はV2へ
*/

// --- Category Schemas ---
export const CreateCategoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;