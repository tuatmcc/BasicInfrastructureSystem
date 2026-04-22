import type { IDiscordController } from "../../DiscordController";
import type { IDiscordDatabaseController } from "../../DiscordDatabaseController";
import type { CategoryData, Snowflake } from "../../types";

export class CategoryService {
  constructor(
    private readonly controller: IDiscordController,
    private readonly dbController: IDiscordDatabaseController,
  ) {}

  async createCategory(name: string, position: number | null = null): Promise<CategoryData> {
    const category = await this.controller.createCategory(name, position);
    try {
      await this.dbController.createCategory(category.id, category.name);
    } catch (error) {
      console.error("Failed to save category to database", error);
    }
    return category;
  }

  async deleteCategory(categoryId: Snowflake): Promise<boolean> {
    const success = await this.controller.deleteCategory(categoryId);
    if (success) {
      try {
        await this.dbController.deleteCategory(categoryId);
      } catch (error) {
        console.error("Failed to delete category from database", error);
      }
    }
    return success;
  }

  async listCategories(): Promise<CategoryData[]> {
    return this.controller.listCategories();
  }
}
