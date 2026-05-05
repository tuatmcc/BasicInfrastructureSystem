import { AppContext } from "../../core/types"
import { roles } from "../../../drizzle/schema"
import { eq } from "drizzle-orm"
import { RouteHandler } from "@hono/zod-openapi"
import { 
    createRoleRoute, 
    listRolesRoute, 
    getRoleByIdRoute, 
    updateRoleRoute, 
    deleteRoleRoute 
} from "./schema"


// ***** role *****
// ロール定義の管理ロジック
// ロールの名前や ID などのマスターデータを操作します
// *****************

// create
// ロールを新規作成する
export const createRoleService: RouteHandler<typeof createRoleRoute, AppContext> = async (c) => {
    const body = c.req.valid("json");
    const db = c.get("db");

    // 自動生成された roles オブジェクトを使用してインサート
    const [newRole] = await db.insert(roles).values({
      roleName: body.roleName
    }).returning();

    return c.json(newRole, 201);
};

// read
// ロール一覧を取得する
export const listRolesService: RouteHandler<typeof listRolesRoute, AppContext> = async (c) => {
    const db = c.get("db");
    const allRoles = await db.select().from(roles);
    return c.json(allRoles, 200);
};

// 特定のロール情報を取得する
export const getRoleByIdService: RouteHandler<typeof getRoleByIdRoute, AppContext> = async (c) => {
    const { id } = c.req.valid("param");
    const db = c.get("db");
    const [role] = await db.select().from(roles).where(eq(roles.roleId, id));
    
    if (!role) {
        return c.json({ error: "Role not found" }, 404);
    }

    return c.json(role, 200);
};

// update
// ロール情報を更新する
export const updateRoleService: RouteHandler<typeof updateRoleRoute, AppContext> = async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = c.get("db");

    const [updatedRole] = await db.update(roles)
        .set({ roleName: body.roleName })
        .where(eq(roles.roleId, id))
        .returning();

    if (!updatedRole) {
        return c.json({ error: "Role not found" }, 404);
    }

    return c.json(updatedRole, 200);
};

// delete
// ロールを削除する
export const deleteRoleService: RouteHandler<typeof deleteRoleRoute, AppContext> = async (c) => {
    const { id } = c.req.valid("param");
    const db = c.get("db");

    await db.delete(roles).where(eq(roles.roleId, id));

    return c.body(null, 204);
};
