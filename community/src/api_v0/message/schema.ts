import { z } from "@hono/zod-openapi"
import { createRoute } from "@hono/zod-openapi";

const discordSnowflakeSchema = z.string()
    .regex(/^\d{17,20}$/)
    .openapi({ example: "1450087368114704484" });

const errorSchema = z.object({
    error: z.string(),
}).openapi("ErrorResponse");

// ***** message *****
// イベント通知メッセージの管理
// Discord へイベント通知メッセージを送信します
// /: メッセージの送信
// *****************

// リクエスト: 送信するメッセージ内容とメンションするロールID一覧
export const sendMessageSchema = z.object({
    channelId: discordSnowflakeSchema,
    content: z.string()
        .min(1)
        .max(2000)
        .openapi({ example: "イベントが開始されました！" }),
    mentionRoleIds: z.array(discordSnowflakeSchema)
        .max(100)
        .optional()
        .openapi({ example: ["1450087368114704484"] }),
}).openapi("SendMessageRequest")

// レスポンス: 送信したメッセージのID
export const eventMessageSchema = z.object({
    id: z.string().openapi({ example: "6f6d8266-9e0f-4b7b-94c1-8f97b4c4dc4a" }),
    channelId: discordSnowflakeSchema,
    messageId: discordSnowflakeSchema,
    content: z.string().openapi({ example: "イベントが開始されました！" }),
    createdBy: z.string().openapi({ example: "user-123" }),
    createdAt: z.string().openapi({ example: "2026-07-01T12:00:00Z" }),
    updatedAt: z.string().openapi({ example: "2026-07-01T12:00:00Z" }),
}).openapi("EventMessage")

export const reactionMemberSchema = z.object({
    discordUserId: discordSnowflakeSchema,
    discordUsername: z.string(),
    discordGlobalName: z.string().nullable(),
    userId: z.string().nullable(),
    userName: z.string().nullable(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    memberId: z.string().nullable(),
    memberName: z.string().nullable(),
    memberStatus: z.enum(["pending", "active", "rejected", "withdrawn"]).nullable(),
    displayGrade: z.string().nullable(),
    studentId: z.string().nullable(),
    studentEmail: z.string().nullable(),
    emergencyContact: z.string().nullable(),
    insurance: z.boolean().nullable(),
    someAllergy: z.boolean().nullable(),
    allergyDetails: z.string().nullable(),
    skills: z.array(z.string()),
    interests: z.array(z.string()),
    currentActivities: z.string().nullable(),
    bio: z.string().nullable(),
    discordNickname: z.string().nullable(),
    discordRoles: z.array(z.string()),
    reactions: z.array(z.string()),
}).openapi("ReactionMember")

export const messageReactionSummarySchema = z.object({
    eventMessage: eventMessageSchema,
    reactions: z.array(z.object({
        emoji: z.string(),
        count: z.number(),
        users: z.array(reactionMemberSchema),
    })),
    members: z.array(reactionMemberSchema),
}).openapi("MessageReactionSummary")

// create
// イベント通知メッセージを Discord へ送信する
export const createMessageRoute = createRoute({
    method: "post",
    path: "/",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: sendMessageSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "メッセージ送信成功",
            content: {
                "application/json": {
                    schema: eventMessageSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        403: {
            description: "Forbidden",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        404: {
            description: "Not Found",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        502: {
            description: "Bad Gateway",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
    },
});

export const listMessagesRoute = createRoute({
    method: "get",
    path: "/",
    responses: {
        200: {
            description: "イベント通知メッセージ一覧",
            content: {
                "application/json": {
                    schema: eventMessageSchema.array(),
                },
            },
        },
        403: {
            description: "Forbidden",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
    },
});

export const getMessageRoute = createRoute({
    method: "get",
    path: "/:id",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "イベント通知メッセージ詳細",
            content: {
                "application/json": {
                    schema: eventMessageSchema,
                },
            },
        },
        403: {
            description: "Forbidden",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        404: {
            description: "Not Found",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
    },
});

export const getMessageReactionsRoute = createRoute({
    method: "get",
    path: "/:id/reactions",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Discord リアクションユーザー集計",
            content: {
                "application/json": {
                    schema: messageReactionSummarySchema,
                },
            },
        },
        403: {
            description: "Forbidden",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        404: {
            description: "Not Found",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
        502: {
            description: "Bad Gateway",
            content: {
                "application/json": {
                    schema: errorSchema,
                },
            },
        },
    },
});
