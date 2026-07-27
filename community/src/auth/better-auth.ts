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
        user: {
            additionalFields: {
                memberId: { type: "string", required: false, input: false },
                role: { type: "string", defaultValue: "user", input: false }
            }
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
            // Discord is the only identity provider. The same account both signs
            // the member in and supplies the guild membership evidence the join
            // flow verifies, so there is no second provider to link or reconcile.
            discord: {
                clientId: c.env.DISCORD_CLIENT_ID,
                clientSecret: c.env.DISCORD_CLIENT_SECRET,
                // Appended to Better Auth's default identify+email scopes.
                scope: ["guilds"],
            }
        },
        advanced: {
            cookiePrefix: "app-auth"
        }
    });
};

export const getPostLoginRedirectPath = (
    role: 'admin' | 'user',
    memberStatus: string | null | undefined,
) => role === 'admin' ? '/' : memberStatus === 'active' ? '/me' : '/join';

// JWT Endpoint Route definition
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

// JWT Endpoint Handler
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
        const authDb = getAuthDatabase(c);
        const [currentUser] = await authDb
            .select({
                role: schema.user.role,
                memberId: schema.user.memberId,
            })
            .from(schema.user)
            .where(eq(schema.user.id, session.user.id))
            .limit(1);

        if (!currentUser) {
            console.error("[JWT Endpoint] Authenticated user was not found in the application database.");
            return c.redirect(`${frontendUrl}/login?error=user_not_found`);
        }

        const role = currentUser.role === "admin" ? "admin" : "user";
        const db = c.get("db");
        db.setIdentity({
            userId: session.user.id,
            memberId: currentUser.memberId,
            role,
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
            role,
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

        const redirectPath = getPostLoginRedirectPath(role, member?.memberStatus);
        console.log(`[JWT Endpoint] Successfully issued JWT for user ${session.user.id} with role ${payload.role}`);
        return c.redirect(`${frontendUrl}${redirectPath}`);
    } catch (error) {
        console.error("[JWT Endpoint] Error generating JWT:", error);
        return c.redirect(`${frontendUrl}/login?error=jwt_generation_failed`);
    }
};
