import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../../../share/drizzle/schema";
import { AppContext } from "./types";
import { Context } from "hono";

export const getAuth = (c: Context<AppContext>) => {
    const db = c.get("db");
    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            schema: schema
        }),
        secret: c.env.BETTER_AUTH_SECRET || c.env.JWT_SECRET,
        baseURL: c.env.COMMUNITY_URL || "http://localhost:8787",
        // Allow the frontend origin
        trustedOrigins: [
            c.env.FRONTEND_URL || "http://localhost:3000"
        ],
        user: {
            additionalFields: {
                discordUserId: {
                    type: "string",
                    required: false,
                },
                displayName: {
                    type: "string",
                    required: false,
                },
                memberId: {
                    type: "string",
                    required: false,
                },
                role: {
                    type: "string",
                    defaultValue: "user",
                }
            }
        },
        advanced: {
            cookiePrefix: "app-auth"
        }
    });
};
