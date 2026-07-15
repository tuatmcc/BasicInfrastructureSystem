import assert from "node:assert/strict";
import test from "node:test";
import type { Context } from "hono";
import { getAuth } from "./better-auth";
import type { AppContext } from "../core/types";

const createContext = (communityUrl: string) => ({
    get: () => ({}),
    env: {
        JWT_SECRET: "mV8qP2xL7nR4cT9wK3sF6hJ1dB5yG0uQ8aZ2eN7pC4rX9kM6",
        COMMUNITY_URL: communityUrl,
        FRONTEND_URL: communityUrl.replace("api", "app"),
        GITHUB_CLIENT_ID: "test-github-client",
        GITHUB_CLIENT_SECRET: "test-github-secret",
        DISCORD_CLIENT_ID: "test-discord-client",
        DISCORD_CLIENT_SECRET: "test-discord-secret",
    },
}) as unknown as Context<AppContext>;

test("Better Auth marks session cookies secure for an HTTPS deployment", async () => {
    const authContext = await getAuth(createContext("https://api.example.com")).$context;
    const sessionCookie = authContext.authCookies.sessionToken;

    assert.equal(sessionCookie.attributes.secure, true);
    assert.match(sessionCookie.name, /^__Secure-/);
});

test("Better Auth keeps local HTTP development cookies usable", async () => {
    const authContext = await getAuth(createContext("http://localhost:8787")).$context;
    const sessionCookie = authContext.authCookies.sessionToken;

    assert.equal(sessionCookie.attributes.secure, false);
    assert.doesNotMatch(sessionCookie.name, /^__Secure-/);
});
