import { RouteHandler } from "@hono/zod-openapi"
import { AppContext } from "../../core/types"
import { CommunityProviderError } from "../../lib/community/error"
import {
    createMessageRoute,
    getMessageReactionsRoute,
    getMessageRoute,
    listMessagesRoute
} from "./schema"
import {
    communityIdentities,
    communityMemberships,
    eventMessages,
    grades,
    memberDirectoryProfiles,
    members,
    user as authUsers,
} from "../../../../share/drizzle/schema"
import { and, desc, eq, inArray } from "drizzle-orm"
import {
    buildMessageReactionSummary,
    collectDiscordUserIds,
    LinkedReactionUser
} from "./reactions"

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

        const [eventMessage] = await db.transaction((tx) => tx
            .insert(eventMessages)
            .values({
                channelId: body.channelId,
                messageId: result.messageId,
                content: body.content,
                createdBy: appUser.id,
            })
            .returning());

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

    const messages = await c.get("db").transaction((tx) => tx
        .select()
        .from(eventMessages)
        .orderBy(desc(eventMessages.createdAt)));

    return c.json(messages, 200);
};

export const getMessageService: RouteHandler<typeof getMessageRoute, AppContext> = async (c) => {
    const appUser = c.get("appUser");

    if (appUser.role !== "admin") {
        return c.json({ error: "Forbidden" }, 403);
    }

    const [eventMessage] = await c.get("db").transaction((tx) => tx
        .select()
        .from(eventMessages)
        .where(eq(eventMessages.id, c.req.param("id")))
        .limit(1));

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

    const [eventMessage] = await db.transaction((tx) => tx
        .select()
        .from(eventMessages)
        .where(eq(eventMessages.id, c.req.param("id")))
        .limit(1));

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

        const discordUserIds = collectDiscordUserIds(reactionUsersByEmoji);

        const linkedUsers: LinkedReactionUser[] = discordUserIds.length > 0
            ? await db.transaction((tx) => tx
                .select({
                    discordUserId: communityIdentities.providerAccountId,
                    userId: authUsers.id,
                    userName: authUsers.name,
                    email: authUsers.email,
                    memberId: authUsers.memberId,
                    memberName: members.name,
                    memberStatus: members.memberStatus,
                    displayName: memberDirectoryProfiles.displayName,
                    displayGrade: grades.displayGrade,
                    studentId: members.studentId,
                    studentEmail: members.studentEmail,
                    emergencyContact: members.emergencyContact,
                    insurance: members.insurance,
                    someAllergy: members.someAllergy,
                    allergyDetails: members.allergyDetails,
                    skills: memberDirectoryProfiles.skills,
                    interests: memberDirectoryProfiles.interests,
                    currentActivities: memberDirectoryProfiles.currentActivities,
                    bio: memberDirectoryProfiles.bio,
                    discordNickname: communityMemberships.nickname,
                    discordRoles: communityMemberships.roleNames,
                })
                .from(communityIdentities)
                .innerJoin(authUsers, eq(communityIdentities.userId, authUsers.id))
                .leftJoin(members, eq(authUsers.memberId, members.memberId))
                .leftJoin(grades, eq(members.grade, grades.id))
                .leftJoin(memberDirectoryProfiles, eq(members.memberId, memberDirectoryProfiles.memberId))
                .leftJoin(communityMemberships, and(
                    eq(communityMemberships.identityId, communityIdentities.identityId),
                    eq(communityMemberships.communityId, c.env.DISCORD_GUILD_ID),
                ))
                .where(and(
                    eq(communityIdentities.provider, "discord"),
                    inArray(communityIdentities.providerAccountId, discordUserIds),
                )))
            : [];

        const summary = buildMessageReactionSummary(
            eventMessage,
            discordMessage,
            reactionUsersByEmoji,
            linkedUsers,
        );

        c.header("Cache-Control", "private, no-store");
        return c.json({
            eventMessage: summary.eventMessage,
            reactions: summary.reactions,
            members: summary.members,
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
