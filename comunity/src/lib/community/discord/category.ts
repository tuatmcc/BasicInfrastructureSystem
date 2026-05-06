import { Category, CategorySchema, CreateCategoryInput } from '../type';
import type { DiscordProvider } from './main';

export async function createCategoryAPI(provider: DiscordProvider, input: CreateCategoryInput): Promise<Category> {
  const data = await provider.request<any>('POST', `/guilds/${provider.guildId}/channels`, {
    name: input.name,
    type: 4, // 4 is Category in Discord
    position: input.position,
  });

  return CategorySchema.parse({
    id: data.id,
    name: data.name,
    position: data.position,
  });
}

export async function deleteCategoryAPI(provider: DiscordProvider, categoryId: string): Promise<void> {
  await provider.request('DELETE', `/channels/${categoryId}`);
}

export async function listCategoriesAPI(provider: DiscordProvider): Promise<Category[]> {
  const channels = await provider.request<any[]>('GET', `/guilds/${provider.guildId}/channels`);
  
  return channels
    .filter(channel => channel.type === 4)
    .map(channel => CategorySchema.parse({
      id: channel.id,
      name: channel.name,
      position: channel.position,
    }));
}
