import { RouteHandler } from "@hono/zod-openapi";
import { AppContext } from "../../core/types";
import { createUserRoute, listUsersRoute } from "./schema";

// Mock user data
const mockUser = {
    id: "d83f3347-888a-4b9e-9c99-24ebeadf1b60",
    discordUserId: "1501602493606662264",
    displayName: "John Doe",
    memberId: "ed55db90-f5b1-488d-be10-558c12de30e6",
    authId: "6ab5e204-7f19-4d03-aa41-485fd78b97ed"
};

export const createUserService: RouteHandler<typeof createUserRoute, AppContext> = async (c) => {
    // 実際の実装ではリクエストボディをDBに保存しますが、現在はモックを返します
    return c.json(mockUser, 201);
};

export const listUsersService: RouteHandler<typeof listUsersRoute, AppContext> = async (c) => {
    // 実際の実装ではDBから全ユーザーを取得しますが、現在はモックの配列を返します
    return c.json([mockUser], 200);
};
