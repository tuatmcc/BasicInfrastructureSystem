import { AppContext } from "../../../core/types"
import { roles, userRole, users } from "../../../../drizzle/schema";
import { RouteHandler } from "@hono/zod-openapi"
import { getUserMeRolesRoute, addUserRolesRoute,delUserRolesRoute, getUserRolesByIdRoute } from "./schema";
import { eq,getTableColumns } from "drizzle-orm";

// ***** user role *****
// ユーザーロール管理のビジネスロジック
// ユーザーとロールの紐付けを操作します
// *****************

const mockRole = { role_id: "r-123", role_name: "admin" };

// create
export const addUserRolesService:RouteHandler <typeof addUserRolesRoute,AppContext> = async (c) => {
    const isadmin = ("admin" === c.get("appUser").role);
    if (! isadmin){
        return c.json({ message: "Unauthorized" }, 401);
    }

    const addedUserId = c.req.param("id");
    const addRoleId = c.req.valid("json").roleId;
    const db = c.get("db");
    await db.insert(userRole).values({
        roleId: addRoleId,
        userId: addedUserId
    })
    return c.json(null,200);
};

// read
// ロール一覧を取得する
export const getUserRolesMeService:RouteHandler <typeof getUserMeRolesRoute, AppContext> = async (c) => {
    const appuser = c.get("appUser");
    const listroles = await c.get("db").select({ ...getTableColumns(roles) }).from(roles)
        .leftJoin(userRole,eq(roles.roleId,userRole.roleId))
        .where(eq(userRole.userId,appuser.id));
    return c.json(listroles,200);
};

export const getUserRolesByIdService:RouteHandler <typeof getUserRolesByIdRoute, AppContext> = async (c) => {
     const isadmin = ("admin" === c.get("appUser").role);
    if (! isadmin){
        return c.json({ message: "Unauthorized" }, 401);
    }

    const listroles = await c.get("db").select({ ...getTableColumns(roles) }).from(roles)
        .leftJoin(userRole,eq(roles.roleId,userRole.roleId))
        .where(eq(userRole.userId,c.req.param("id")));
    return c.json(listroles,200);
};

// update
// addとdelで行う

// del
export const delUserRolesService:RouteHandler <typeof delUserRolesRoute,AppContext> = async (c) => {
    const isadmin = ("admin" === c.get("appUser").role);
    if (! isadmin){
        return c.json({ message: "Unauthorized" }, 401);
    }

    const deletedUserid = c.req.param("id");
    const deleteRoleiD = c.req.valid("json").roleId;
    const db = c.get("db");
    await db.delete(userRole).where(eq(eq(userRole.roleId,deleteRoleiD),eq(userRole.userId,deletedUserid)))
    return c.json(null,200);
};