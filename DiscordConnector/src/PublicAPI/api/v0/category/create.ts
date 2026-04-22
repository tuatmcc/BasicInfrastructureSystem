import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { categoryResponse } from "../../../responses";
import {
  bearerSecurity,
  CategorySchema,
  commonErrorResponses,
  createCategoryBodySchema,
  getServices,
  jsonBody,
  jsonContent,
  requireRoleMiddleware,
  type AppEnv,
} from "../../../shared";

export function registerCreateCategoryRoute(app: OpenAPIHono<AppEnv>): void {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v0/category/create",
      security: bearerSecurity,
      middleware: requireRoleMiddleware("admin"),
      request: {
        body: jsonBody(createCategoryBodySchema, "Category creation payload"),
      },
      responses: {
        200: jsonContent(CategorySchema, "Created category"),
        ...commonErrorResponses(),
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const category = await getServices(c.env).categoryService.createCategory(
        body.name,
        body.position ?? null,
      );
      return c.json(categoryResponse(category), 200);
    },
  );
}
