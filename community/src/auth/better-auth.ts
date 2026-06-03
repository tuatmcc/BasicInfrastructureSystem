import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../../../share/drizzle/schema";
import { AppContext } from "../core/types";
import { Context } from "hono";
import { createRoute, z } from "@hono/zod-openapi";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";

export const getAuth = (c: Context<AppContext>) => {
    const db = c.get("db");
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            schema: schema
        }),
        secret:  c.env.JWT_SECRET,
        baseURL: c.env.COMMUNITY_URL || "http://localhost:8787",
        trustedOrigins: [
            c.env.FRONTEND_URL || "http://localhost:3000"
        ],
        user: {
            additionalFields: {
                discordUserId: { type: "string", required: false },
                displayName: { type: "string", required: false },
                memberId: { type: "string", required: false },
                role: { type: "string", defaultValue: "user" }
            }
        },
        socialProviders: {
            github: {
                clientId: c.env.GITHUB_CLIENT_ID,
                clientSecret: c.env.GITHUB_CLIENT_SECRET,
            },
            discord: {
                clientId: c.env.DISCORD_CLIENT_ID,
                clientSecret: c.env.DISCORD_CLIENT_SECRET,
            }
        },
        advanced: {
            cookiePrefix: "app-auth",
            // ローカルHTTP開発のための設定
            useSecureCookies: false 
        }
    });
};

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
        const payload = {
            id: session.user.id,
            discordid: (session.user as any).discordUserId || null,
            name: session.user.name,
            displayName: (session.user as any).displayName || session.user.name,
            role: ((session.user as any).role as 'admin' | 'user') || 'user',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
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

        console.log(`[JWT Endpoint] Successfully issued JWT for user ${session.user.id} with role ${payload.role}`);
        return c.redirect(frontendUrl);
    } catch (error) {
        console.error("[JWT Endpoint] Error generating JWT:", error);
        return c.redirect(`${frontendUrl}/login?error=jwt_generation_failed`);
    }
};

