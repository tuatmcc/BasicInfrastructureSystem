import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../../shared";
import { registerCreateCategoryRoute } from "./create";
import { registerDeleteCategoryRoute } from "./delete";
import { registerListCategoryRoute } from "./list";

export function registerCategoryRoutes(app: OpenAPIHono<AppEnv>): void {
  registerCreateCategoryRoute(app);
  registerDeleteCategoryRoute(app);
  registerListCategoryRoute(app);
}
