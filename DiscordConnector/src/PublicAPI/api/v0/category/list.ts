import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { categoryResponse } from "../../../responses";
import {
  bearerSecurity,
  CategorySchema,
  commonErrorResponses,
  getServices,
  jsonContent,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

export function registerListCategoryRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v0/category/list",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("viewer"),
      responses: {
        200: jsonContent(z.array(CategorySchema), "Category list"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const categories = await getServices(c.env).categoryService.listCategories();
      return c.json(categories.map(categoryResponse), 200);
    },
  );
}
