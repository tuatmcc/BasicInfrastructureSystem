import type { DiscordMessage, DiscordReactionUser } from "../../lib/community/type";

export type EventMessageRecord = {
    id: string;
    channelId: string;
    messageId: string;
    content: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};

export type LinkedReactionUser = {
    discordUserId: string | null;
    userId: string;
    userName: string;
    displayName: string | null;
    email: string;
    memberId: string | null;
    memberName: string | null;
    displayGrade: string | null;
    studentId: string | null;
    studentEmail: string | null;
    emergencyContact: string | null;
    insurance: boolean | null;
    someAllergy: boolean | null;
};

export type ReactionUsersByEmoji = {
    emoji: string;
    count: number;
    users: DiscordReactionUser[];
};

export type ReactionMember = {
    discordUserId: string;
    discordUsername: string;
    discordGlobalName: string | null;
    userId: string | null;
    userName: string | null;
    displayName: string | null;
    email: string | null;
    memberId: string | null;
    memberName: string | null;
    displayGrade: string | null;
    studentId: string | null;
    studentEmail: string | null;
    emergencyContact: string | null;
    insurance: boolean | null;
    someAllergy: boolean | null;
    reactions: string[];
};

export const collectDiscordUserIds = (reactionUsersByEmoji: ReactionUsersByEmoji[]) => (
    Array.from(new Set(
        reactionUsersByEmoji.flatMap((reaction) => reaction.users.map((user) => user.id))
    ))
);

export const buildMessageReactionSummary = (
    eventMessage: EventMessageRecord,
    discordMessage: DiscordMessage,
    reactionUsersByEmoji: ReactionUsersByEmoji[],
    linkedUsers: LinkedReactionUser[],
) => {
    const linkedUserMap = new Map(
        linkedUsers
            .filter((user) => user.discordUserId)
            .map((user) => [user.discordUserId, user])
    );
    const memberMap = new Map<string, ReactionMember>();

    const reactions = reactionUsersByEmoji.map((reaction) => {
        const users = reaction.users.map((discordUser) => {
            const linkedUser = linkedUserMap.get(discordUser.id);
            const reactionMember: ReactionMember = {
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
                memberMap.set(discordUser.id, {
                    ...reactionMember,
                    reactions: [...reactionMember.reactions],
                });
            }

            return {
                ...reactionMember,
                reactions: [...reactionMember.reactions],
            };
        });

        return {
            emoji: reaction.emoji,
            count: reaction.count,
            users,
        };
    });

    return {
        eventMessage,
        discordMessage,
        reactions,
        members: Array.from(memberMap.values()),
    };
};
