import { RouteHandler } from "@hono/zod-openapi"
import { AppContext } from "../../core/types"
import { CommunityProviderError } from "../../lib/community/error"
import {
    createMessageRoute,
    getMessageReactionsRoute,
    getMessageRoute,
    listMessagesRoute
} from "./schema"
import { eventMessages, grades, members, user as authUsers } from "../../../../share/drizzle/schema"
import { desc, eq, inArray } from "drizzle-orm"

// ***** message *****
// イベント通知メッセージ送信のビジネスロジック
// リクエストを受け取り、Discord 操作（community プロバイダ）へ委譲します
// *****************

// create
// イベント通知メッセージを Discord へ送信し、メッセージIDを返す
export const createMessageService: RouteHandler<typeof createMessageRoute, AppContext> = async (c) => {
    const body = c.req.valid("json");
    const appUser = c.get("appUser");
    const community = c.get("community");
    const db = c.get("db");

    if (appUser.role !== "admin") {
        return c.json({ error: "Forbidden" }, 403);
    }

    try {
        const result = await community.sendMessage({
            channelId: body.channelId,
            content: body.content,
            mentionRoleIds: body.mentionRoleIds,
        });

        const [eventMessage] = await db
            .insert(eventMessages)
            .values({
                channelId: body.channelId,
                messageId: result.messageId,
                content: body.content,
                createdBy: appUser.id,
            })
            .returning();

        return c.json(eventMessage, 201);
    } catch (error) {
        if (error instanceof CommunityProviderError) {
            if (error.status === 400 || error.status === 403 || error.status === 404) {
                return c.json({ error: "Discord request failed" }, error.status);
            }

            return c.json({ error: "Discord service unavailable" }, 502);
        }

        throw error;
    }
};

export const listMessagesService: RouteHandler<typeof listMessagesRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");

    if (appUser.role !== "admin") {
        return c.json({ error: "Forbidden" }, 403);
    }

    const messages = await c.get("db")
        .select()
        .from(eventMessages)
        .orderBy(desc(eventMessages.createdAt));

    return c.json(messages, 200);
};

export const getMessageService: RouteHandler<typeof getMessageRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");

    if (appUser.role !== "admin") {
        return c.json({ error: "Forbidden" }, 403);
    }

    const [eventMessage] = await c.get("db")
        .select()
        .from(eventMessages)
        .where(eq(eventMessages.id, c.req.param("id")))
        .limit(1);

    if (!eventMessage) {
        return c.json({ error: "Event message not found" }, 404);
    }

    return c.json(eventMessage, 200);
};

export const getMessageReactionsService: RouteHandler<typeof getMessageReactionsRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");
    const community = c.get("community");
    const db = c.get("db");

    if (appUser.role !== "admin") {
        return c.json({ error: "Forbidden" }, 403);
    }

    const [eventMessage] = await db
        .select()
        .from(eventMessages)
        .where(eq(eventMessages.id, c.req.param("id")))
        .limit(1);

    if (!eventMessage) {
        return c.json({ error: "Event message not found" }, 404);
    }

    try {
        const discordMessage = await community.getMessage(eventMessage.channelId, eventMessage.messageId);
        const reactionUsersByEmoji = await Promise.all(
            discordMessage.reactions.map(async (reaction) => ({
                emoji: reaction.emoji,
                count: reaction.count,
                users: await community.listMessageReactionUsers(
                    eventMessage.channelId,
                    eventMessage.messageId,
                    reaction.emoji
                ),
            }))
        );

        const discordUserIds = Array.from(new Set(
            reactionUsersByEmoji.flatMap((reaction) => reaction.users.map((user) => user.id))
        ));

        const linkedUsers = discordUserIds.length > 0
            ? await db
                .select({
                    discordUserId: authUsers.discordUserId,
                    userId: authUsers.id,
                    userName: authUsers.name,
                    displayName: authUsers.displayName,
                    email: authUsers.email,
                    memberId: authUsers.memberId,
                    memberName: members.name,
                    displayGrade: grades.displayGrade,
                    studentId: members.studentId,
                    studentEmail: members.studentEmail,
                    emergencyContact: members.emergencyContact,
                    insurance: members.insurance,
                    someAllergy: members.someAllergy,
                })
                .from(authUsers)
                .leftJoin(members, eq(authUsers.memberId, members.memberId))
                .leftJoin(grades, eq(members.grade, grades.id))
                .where(inArray(authUsers.discordUserId, discordUserIds))
            : [];

        const linkedUserMap = new Map(
            linkedUsers
                .filter((user) => user.discordUserId)
                .map((user) => [user.discordUserId, user])
        );
        const memberMap = new Map<string, any>();

        const reactions = reactionUsersByEmoji.map((reaction) => {
            const users = reaction.users.map((discordUser) => {
                const linkedUser = linkedUserMap.get(discordUser.id);
                const reactionMember = {
                    discordUserId: discordUser.id,
                    discordUsername: discordUser.username,
                    discordGlobalName: discordUser.globalName,
                    userId: linkedUser?.userId ?? null,
                    userName: linkedUser?.userName ?? null,
                    displayName: linkedUser?.displayName ?? null,
                    email: linkedUser?.email ?? null,
                    memberId: linkedUser?.memberId ?? null,
                    memberName: linkedUser?.memberName ?? null,
                    displayGrade: linkedUser?.displayGrade ?? null,
                    studentId: linkedUser?.studentId ?? null,
                    studentEmail: linkedUser?.studentEmail ?? null,
                    emergencyContact: linkedUser?.emergencyContact ?? null,
                    insurance: linkedUser?.insurance ?? null,
                    someAllergy: linkedUser?.someAllergy ?? null,
                    reactions: [reaction.emoji],
                };

                const existingMember = memberMap.get(discordUser.id);
                if (existingMember) {
                    existingMember.reactions.push(reaction.emoji);
                } else {
                    memberMap.set(discordUser.id, { ...reactionMember });
                }

                return reactionMember;
            });

            return {
                emoji: reaction.emoji,
                count: reaction.count,
                users,
            };
        });

        return c.json({
            eventMessage,
            reactions,
            members: Array.from(memberMap.values()),
        }, 200);
    } catch (error) {
        if (error instanceof CommunityProviderError) {
            if (error.status === 404) {
                return c.json({ error: "Discord message not found" }, 404);
            }

            return c.json({ error: "Discord service unavailable" }, 502);
        }

        throw error;
    }
};
