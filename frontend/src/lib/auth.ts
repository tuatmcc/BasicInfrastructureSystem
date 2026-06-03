import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_COMMUNITY_API_URL || "http://localhost:8787/auth",
});

// front -> auth(database) -> community -> front
/*
コミュニティにリダイレクト
コミュニティでrole注入
認証情報＋roleをJWTでフロントに返す
*/ 
