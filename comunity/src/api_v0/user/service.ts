import { AppContext } from "../../core/types"
import { users } from "../../../drizzle/schema";
import { RouteHandler } from "@hono/zod-openapi"
import { createUserRoute, deleteUserByIdRoute, getUserByIdRoute, getUserMeRoute, listUsersRoute, updateUserByIdRoute, updateUserMeRoute } from "./schema";
import { eq } from "drizzle-orm";

// ***** user *****
// ユーザープロフィールのビジネスロジック
// モックデータを使用してプロフィール操作を提供します
// *****************

const mockUser = { 
    discordUserId: "",
    displayName: "John Doe",
    memberId: "",
    authUserId: "",
};

// create
// ユーザーを新規作成する
export const createUserService: RouteHandler<typeof createUserRoute, AppContext>  = async (c) => {
    const isadmin = ("admin" === c.get("appUser").role);
    if (! isadmin){
        return c.json({ message: "Unauthorized" }, 401);
    }

    const db = c.get("db");
    const [newuser] = await db.insert(users).values(c.req.valid("json")).returning();

    return c.json(newuser, 201);
};

// read
// ユーザー一覧を取得する
export const listUsersService: RouteHandler<typeof listUsersRoute,AppContext> = async (c) =>{
    //todo: 条件で絞り込みできるようにする。
    const isadmin = ("admin" === c.get("appUser").role);
    if( ! isadmin) return c.json({ message: "権限がありません" },401);

    const db = c.get("db");
    const listusers = await db.select().from(users);
    
    return c.json(listusers,200);
};

// 自身の情報を取得する
export const getUserMeService: RouteHandler<typeof getUserMeRoute,AppContext> = async (c) => {
    const appuser = c.get("appUser");
    const [user] = await c.get("db").select().from(users).where(eq(users.id,appuser.id)) 
    return c.json(user, 200);
};

// 特定ユーザーの情報を取得する
export const getUserByIdService: RouteHandler<typeof getUserByIdRoute,AppContext> = async (c) => {
    const isadmin = ("admin" === c.get("appUser").role);
    if( ! isadmin) return c.json({ message: "権限がありません" },401);

    const [user] = await c.get("db").select().from(users).where(eq(users.id,c.req.param("id"))) 
    return c.json(user, 200);
};

// update
// 自身の情報を更新する
export const updateUserMeService: RouteHandler<typeof updateUserMeRoute, AppContext> = async (c) => {
    const user = c.get("appUser");
    const body = await c.req.valid("json");
    const [updateuser] = await c.get("db").update(users).set(body).where(eq(users.id,user.id)).returning();

    return c.json(updateuser, 200);
};

// 特定ユーザーの情報を更新する
export const updateUserByIdService: RouteHandler<typeof updateUserByIdRoute,AppContext> = async (c) => {
    const isadmin = ("admin" === c.get("appUser").role);
    if( ! isadmin) return c.json({ message: "権限がありません" },401);

    const body = await c.req.valid("json");
    const [updateuser] = await c.get("db").update(users).set(body).where(eq(users.id,c.req.param("id"))).returning();
    return c.json(updateuser, 200);
};

// delete
// 特定ユーザーを削除する
export const deleteUserByIdService: RouteHandler<typeof deleteUserByIdRoute,AppContext> = async (c) => {
    const isadmin = ("admin" === c.get("appUser").role);
    if( ! isadmin) return c.json({ message: "権限がありません" },401);

    await c.get("db").delete(users).where(eq(users.id,c.req.param("id")));
    return c.json(null, 200);
};
