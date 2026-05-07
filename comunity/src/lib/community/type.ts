import { z } from 'zod';

/*
community propiderの入出力スキーマ
変更不可
する場合はV2へ
*/

// --- Category Schemas ---

export const CategorySchema = z.object({
      id: z.string(),
      name: z.string()
});
export type Category = z.infer<typeof CategorySchema>;

export const CreateCategoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;


export const CreateCategoryOutputSchema = z.object({
  status: z.number()
});
export type CreateCategoryOutput = z.infer<typeof CreateCategoryOutputSchema>;

export const DeleteCategoryOutputSchema = z.object({
  status: z.number()
});
export type DeleteCategoryOutput = z.infer<typeof DeleteCategoryOutputSchema>;

export const ListCategoriesOutputSchema = z.array(CategorySchema);
export type ListCategoriesOutput = z.infer<typeof ListCategoriesOutputSchema>;
