import { CreateCategoryInput, CreateCategoryOutput, DeleteCategoryOutput, ListCategoriesOutput } from './type';

// --- Interface Definition ---

export interface CommunityProvider {

// category
  createCategory(input: CreateCategoryInput): Promise<CreateCategoryOutput>;
  deleteCategory(id: string): Promise<DeleteCategoryOutput>;
  // listCategories(): Promise<ListCategoriesOutput>;
}
