import { z } from 'zod';
import { CreateCategoryInput, Category, Role } from './type';

// --- Interface Definition ---

export interface CommunityProvider {

// category
  createCategory(input: CreateCategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  listCategories(): Promise<Category[]>;

// role
  listUserRoles(userId: string): Promise<Role[]>;
}
