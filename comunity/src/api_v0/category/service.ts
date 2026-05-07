import { AppContext } from '../../core/types'
import { RouteHandler } from '@hono/zod-openapi'
import { 
    createCategoryRoute, 
    listCategoriesRoute, 
    getCategoryByIdRoute, 
    updateCategoryRoute, 
    deleteCategoryRoute 
} from './schema'
// schema.ts に Route 定義がない場合は service.ts 内で定義するか、router.ts から持ってくる必要があります。
// 現状 router.ts に定義されているため、router.ts から export するか、service.ts を修正します。
// ここではシンプルにするため、HonoのContextベースのまま型を整えます。

// ***** category *****
// カテゴリ管理のビジネスロジック
// CommunityProvider (Discord等) を介して操作を行います
// *****************

// create
export const createCategoryService: any = async (c: any) => {
  const categoryname = c.req.valid("json").category_name;
  const community = c.get('community');

  const newCategory = await community.createCategory({name:categoryname});

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
  const id = c.req.param('id');
  const community = c.get('community');
  
  await community.deleteCategory(id);
  
  return c.body(null, 204);
};

export const getCategoryByIdService: any = async (c: any) => c.json({ error: 'Not implemented' }, 501);
export const updateCategoryService: any = async (c: any) => c.json({ error: 'Not implemented' }, 501);