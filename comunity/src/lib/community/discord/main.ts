import type { CommunityProvider } from '../interface';
import type { 
  CreateCategoryInput, 
  CreateCategoryOutput, 
  DeleteCategoryOutput, 
  ListCategoriesOutput 
} from '../type';
import { createCategoryAPI, deleteCategoryAPI } from './category';

export class DiscordProvider implements CommunityProvider {
  private readonly API_BASE = 'https://discord.com/api/v10';

  constructor(
    public readonly token: string,
    public readonly guildId: string
  ) {}

  async request(method: string, path: string, body?: unknown): Promise<Response> {
    const response = await fetch(`${this.API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Discord API Error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    return response;
  }

  async createCategory(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
    return createCategoryAPI(this, input);
  }
  async deleteCategory(id: string): Promise<DeleteCategoryOutput> {
    return deleteCategoryAPI(this, id);
  }
  // async listCategories(): Promise<ListCategoriesOutput> {
  //   return listCategoriesAPI(this);
  // }
}
