// import { OpenAPIHono } from "@hono/zod-openapi";
// import { 
//     createRoleRoute, 
//     listRolesRoute, 
//     getRoleByIdRoute, 
//     updateRoleRoute, 
//     deleteRoleRoute 
// } from "./schema";
// import type { AppContext } from "../../core/types";
// import {
//     createRoleService,
//     listRolesService,
//     getRoleByIdService,
//     updateRoleService,
//     deleteRoleService
// } from "./service";

// // ***** role *****
// // ロール定義（マスターデータ）の管理
// // システム全体で利用可能なロール（管理者、一般等）の定義自体を操作します
// // *****************

// export const roleRouter = new OpenAPIHono<AppContext>()
//     .openapi(createRoleRoute, createRoleService)
//     .openapi(listRolesRoute, listRolesService)
//     .openapi(getRoleByIdRoute, getRoleByIdService)
//     .openapi(updateRoleRoute, updateRoleService)
//     .openapi(deleteRoleRoute, deleteRoleService);
