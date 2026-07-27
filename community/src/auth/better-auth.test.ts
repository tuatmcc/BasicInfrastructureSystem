import assert from "node:assert/strict";
import test from "node:test";
import type { Context } from "hono";
import { getAuth, getPostLoginRedirectPath } from "./better-auth";
import type { AppContext } from "../core/types";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../../share/drizzle/schema";

const testDatabase = drizzle.mock({ schema });

const createContext = (communityUrl: string) => ({
    get: () => ({}),
    env: {
        BETTER_AUTH_SECRET: "better-auth-secret-mV8qP2xL7nR4cT9wK3sF6hJ1",
        JWT_SECRET: "jwt-secret-dB5yG0uQ8aZ2eN7pC4rX9kM6sF7hJ2",
        COMMUNITY_URL: communityUrl,
        FRONTEND_URL: communityUrl.replace("api", "app"),
        DISCORD_CLIENT_ID: "test-discord-client",
        DISCORD_CLIENT_SECRET: "test-discord-secret",
    },
}) as unknown as Context<AppContext>;

test("Better Auth marks session cookies secure for an HTTPS deployment", async () => {
    const authContext = await getAuth(createContext("https://api.example.com"), testDatabase).$context;
    const sessionCookie = authContext.authCookies.sessionToken;

    assert.equal(sessionCookie.attributes.secure, true);
    assert.match(sessionCookie.name, /^__Secure-/);
});

test("Better Auth keeps local HTTP development cookies usable", async () => {
    const authContext = await getAuth(createContext("http://localhost:8787"), testDatabase).$context;
    const sessionCookie = authContext.authCookies.sessionToken;

    assert.equal(sessionCookie.attributes.secure, false);
    assert.doesNotMatch(sessionCookie.name, /^__Secure-/);
});

test("Better Auth signs members in with Discord as the only provider", async () => {
    const authContext = await getAuth(createContext("https://api.example.com"), testDatabase).$context;
    const linking = authContext.options.account?.accountLinking;
    const providers = authContext.options.socialProviders ?? {};
    const discord = providers.discord;

    assert.equal(authContext.secret, "better-auth-secret-mV8qP2xL7nR4cT9wK3sF6hJ1");
    assert.equal(authContext.options.account?.encryptOAuthTokens, true);
    assert.equal(linking?.enabled, true);
    assert.equal(linking?.disableImplicitLinking, true);
    assert.equal(linking?.allowDifferentEmails, true);
    assert.equal(linking?.allowUnlinkingAll, false);
    assert.equal(linking?.updateUserInfoOnLink, false);
    // Discord is the sole identity provider, so sign-up through it must stay open.
    assert.deepEqual(Object.keys(providers), ["discord"]);
    assert.ok(!("disableSignUp" in (discord ?? {})));
    // Better Auth appends this to its default identify+email scopes.
    assert.deepEqual(discord?.scope, ["guilds"]);
    // Membership and role are domain facts held in public.app_accounts. Better
    // Auth must not carry them, or its tables could not move to another
    // database without taking domain columns along.
    assert.ok(!("user" in authContext.options));
});

test("post-login routing only sends active members to their profile", () => {
    assert.equal(getPostLoginRedirectPath("admin", null), "/");
    assert.equal(getPostLoginRedirectPath("user", "active"), "/me");
    assert.equal(getPostLoginRedirectPath("user", "pending"), "/join");
    assert.equal(getPostLoginRedirectPath("user", "rejected"), "/join");
    assert.equal(getPostLoginRedirectPath("user", "withdrawn"), "/join");
    assert.equal(getPostLoginRedirectPath("user", null), "/join");
});
