import { AppContext } from '../../core/types'
import { RouteHandler } from '@hono/zod-openapi'
import { 
    createCategoryRoute, 
    listCategoriesRoute, 
    getCategoryByIdRoute, 
    updateCategoryRoute, 
    deleteCategoryRoute 
} from './schema'
import { categories } from '../../../drizzle/schema';


// ***** category *****
// カテゴリ管理のビジネスロジック
// CommunityProvider (Discord等) を介して操作を行います
// *****************

// create
export const createCategoryService:RouteHandler<typeof createCategoryRoute, AppContext> = async (c) => {
  if( "admin" !== c.get("appUser").role){
     return c.json({ message: "Unauthorized" }, 401);
  }
  const categoryname = c.req.valid("json").categoryName;
  const community = c.get('community');

  await community.createCategory({name:categoryname});// エラーはlibでやってくれる
  await c.get("db").insert(categories).values(c.req.valid("json"));

  return c.json(null, 201);
};

// read
export const listCategoriesService: any = async (c: any) => {
  const community = c.get('community');
  const categories = await community.listCategories();

  return c.json(categories.map((cat: any) => ({
    category_id: cat.id,
    category_name: cat.name
  })), 200);
};

// delete
export const deleteCategoryService: any = async (c: any) => {
  if( "admin" !== c.get("appUser").role){
     return c.json({ message: "Unauthorized" }, 401);
  }
  const categorynId = c.req.valid("json").categoryId;
  const community = c.get('community');

  await community.deleteCategory({id:categorynId});// エラーはlibでやってくれる
  // await c.get("db").del(categories).values(c.req.valid("json"));

  return c.json(null, 201);
};

export const getCategoryByIdService: any = async (c: any) => c.json({ error: 'Not implemented' }, 501);
export const updateCategoryService: any = async (c: any) => c.json({ error: 'Not implemented' }, 501);