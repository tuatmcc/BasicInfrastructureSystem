import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../core/types";
import { createUserRoute, listUsersRoute } from "./schema";

// Mock user data matching the new Better Auth 'user' table
const mockUser = {
    id: "d83f3347-888a-4b9e-9c99-24ebeadf1b60",
    name: "John Doe",
    email: "john@example.com",
    emailVerified: true,
    image: "https://example.com/image.png",
    createdAt: new Date(),
    updatedAt: new Date(),
    discordUserId: "1501602493606662264",
    displayName: "John Doe",
    memberId: "ed55db90-f5b1-488d-be10-558c12de30e6",
    role: "user"
};

export const createUserService: RouteHandler<typeof createUserRoute, AppContext> = async (c) => {
    // 実際の実装ではリクエストボディをDBに保存しますが、現在はモックを返します
    return c.json(mockUser as any, 201);
};

export const listUsersService: RouteHandler<typeof listUsersRoute, AppContext> = async (c) => {
    // 実際の実装ではDBから全ユーザーを取得しますが、現在はモックの配列を返します
    return c.json([mockUser as any], 200);
};
