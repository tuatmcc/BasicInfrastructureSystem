import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppContext } from "../../core/types"
import { getMemberRolesRoute, grantRoleRoute, listRolesRoute, revokeRoleRoute } from "./schema"
import { getMemberRolesService, grantRoleService, listRolesService, revokeRoleService } from "./service"

// ロールの付与・剥奪（U-5）。/api/v0/role 以下に置く。
export const roleRouter = new OpenAPIHono<AppContext>()
  .openapi(listRolesRoute, listRolesService)
  .openapi(getMemberRolesRoute, getMemberRolesService)
  .openapi(grantRoleRoute, grantRoleService)
  .openapi(revokeRoleRoute, revokeRoleService)
