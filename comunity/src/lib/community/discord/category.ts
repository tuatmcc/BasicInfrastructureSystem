import { 
  CreateCategoryInput, 
  CreateCategoryOutput, 
  DeleteCategoryOutput, 
  ListCategoriesOutput,
  ListCategoriesOutputSchema
} from '../type';
import type { DiscordProvider } from './main';

export async function createCategoryAPI(provider: DiscordProvider, input: CreateCategoryInput): Promise<CreateCategoryOutput> {
  const response = await provider.request('POST', `/guilds/${provider.guildId}/channels`, {
    name: input.name,
    type: 4 // 4 is Category in Discord
  });

  return { status: response.status };
}

export async function deleteCategoryAPI(provider: DiscordProvider, categoryId: string): Promise<DeleteCategoryOutput> {
  const response = await provider.request('DELETE', `/channels/${categoryId}`);
  return { status: response.status };
}

// export async function listCategoriesAPI(provider: DiscordProvider): Promise<ListCategoriesOutput> {
//   const response = await provider.request('GET', `/guilds/${provider.guildId}/channels`);
//   const data = await response.json();
  
//   const categories = (data || [])
//     .filter((channel: any) => channel.type === 4)
//     .map((channel: any) => ({
//       id: channel.id,
//       name: channel.name
//     }));

//   return ListCategoriesOutputSchema.parse(categories);
// }
