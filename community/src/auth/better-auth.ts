import { can } from "../../../share/permissions";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../../../share/drizzle/schema";
import { AppContext } from "../core/types";
import { Context } from "hono";
import { createRoute, z } from "@hono/zod-openapi";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { getAuthDatabase, type AppDatabase } from "../core/db";
import { findPermissions } from "../core/permissions";

export const getAuth = (c: Context<AppContext>, database?: AppDatabase) => {
    const db = database ?? getAuthDatabase(c);
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            schema: schema
        }),
        secret: c.env.BETTER_AUTH_SECRET,
        baseURL: c.env.COMMUNITY_URL || "http://localhost:8787",
        trustedOrigins: [
            c.env.FRONTEND_URL || "http://localhost:3000"
        ],
        // additionalFields は使わない。部員であることや権限はドメインの情報で、
        // public.app_accounts などに置く。Better Auth のテーブルには認証の情報だけを持たせ、
        // 別のデータベースへ移せるようにしておく。
        databaseHooks: {
            user: {
                create: {
                    // ログインした人は、ドメイン側に自分の行（app_accounts）ができて初めて使える。
                    // トリガーで作ると認証のスキーマがドメインに依存してしまうので、
                    // 境目にあたるここで作る。
                    after: async (createdUser) => {
                        await db
                            .insert(schema.appAccounts)
                            .values({ userId: createdUser.id })
                            .onConflictDoNothing();
                    },
                },
            },
        },
        account: {
            encryptOAuthTokens: true,
            accountLinking: {
                enabled: true,
                disableImplicitLinking: true,
                allowDifferentEmails: true,
                allowUnlinkingAll: false,
                updateUserInfoOnLink: false,
            },
        },
        socialProviders: {
            // ログイン手段は Discord だけ。同じアカウントで、ログインと、
            // 入部時に確かめるサーバー参加の証明の両方をまかなう。
            // そのため、別のログイン手段とアカウントを結び付ける必要がない。
            discord: {
                clientId: c.env.DISCORD_CLIENT_ID,
                clientSecret: c.env.DISCORD_CLIENT_SECRET,
                // Better Auth の既定（identify と email）に追加で求める範囲。
                scope: ["guilds"],
            }
        },
        advanced: {
            cookiePrefix: "app-auth"
        }
    });
};

// ログイン直後に移動させるページを、権限と在籍状態から決める。上から順に判定する。
export const getPostLoginRedirectPath = (
    permissions: readonly string[],
    memberStatus: string | null | undefined,
) => {
    if (can(permissions, "event.manage")) return "/";
    if (can(permissions, "member.read_private")) return "/admin/members";
    if (memberStatus === "active") return "/me";
    return "/join";
};

// JWT を発行するエンドポイントの定義
export const getJwtRoute = createRoute({
    method: "get",
    path: "/jwt",
    summary: "Generate custom JWT and set cookie after successful Better Auth authentication",
    responses: {
        302: {
            description: "Redirect to frontend home with app-authorization cookie set",
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                    }),
                },
            },
        },
    },
});

// JWT を発行するエンドポイントの処理
export const getJwtHandler = async (c: Context<AppContext>) => {
    const auth = getAuth(c);
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000';

    if (!session) {
        console.error("[JWT Endpoint] No session found. Redirecting to login.");
        return c.redirect(`${frontendUrl}/login?error=no_session`);
    }

    try {
        // 誰がログインしたかは Better Auth が確かめた。何ができるかは JWT に入れず、
        // リクエストのたびにデータベースが決める。
        const authDb = getAuthDatabase(c);

        // この行はふつう、ユーザー作成時のフックで作られる。フックが失敗したなどで
        // 行がないと、データベースを直接直す以外に戻る手段がなくなる。
        // ログインのたびに 1 回書き込むだけで防げるので、ここでも作っておく。
        await authDb
            .insert(schema.appAccounts)
            .values({ userId: session.user.id })
            .onConflictDoNothing();

        const [currentUser] = await authDb
            .select({ memberId: schema.appAccounts.memberId })
            .from(schema.appAccounts)
            .where(eq(schema.appAccounts.userId, session.user.id))
            .limit(1);

        if (!currentUser) {
            console.error("[JWT Endpoint] Authenticated user has no application account.");
            return c.redirect(`${frontendUrl}/login?error=user_not_found`);
        }

        const db = c.get("db");
        db.setIdentity({
            userId: session.user.id,
        });

        const memberId = currentUser.memberId;
        const [member] = memberId
            ? await db.transaction((tx) => tx
                .select({ memberStatus: schema.members.memberStatus })
                .from(schema.members)
                .where(eq(schema.members.memberId, memberId))
                .limit(1))
            : [];
        const payload = {
            id: session.user.id,
            sid: session.session.id,
            name: session.user.name,
            exp: Math.min(
                Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
                Math.floor(new Date(session.session.expiresAt).getTime() / 1000),
            ),
        };

        const token = await sign(payload, c.env.JWT_SECRET, 'HS256');
        const isLocal = !c.env.COMMUNITY_URL || c.env.COMMUNITY_URL.includes('localhost');

        setCookie(c, 'app-authorization', token, {
            path: '/',
            httpOnly: true,
            secure: !isLocal,
            sameSite: 'Lax',
            maxAge: 60 * 60 * 24 * 7,
            domain: c.env.COOKIE_DOMAIN || undefined,
        });

        const permissions = await findPermissions(authDb, session.user.id);
        const redirectPath = getPostLoginRedirectPath(permissions, member?.memberStatus);
        console.log(`[JWT Endpoint] Successfully issued JWT for user ${session.user.id}`);
        return c.redirect(`${frontendUrl}${redirectPath}`);
    } catch (error) {
        console.error("[JWT Endpoint] Error generating JWT:", error);
        return c.redirect(`${frontendUrl}/login?error=jwt_generation_failed`);
    }
};
