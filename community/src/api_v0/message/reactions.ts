import type { CommunityMessage, CommunityReactionUser } from "../../lib/community/type";
import type { MemberStatus } from "../../../../share/drizzle/schema";

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
    discordUserId: string;
    userId: string;
    userName: string;
    email: string;
    memberId: string | null;
    memberName: string | null;
    memberStatus: MemberStatus | null;
    displayName: string | null;
    displayGrade: string | null;
    studentId: string | null;
    studentEmail: string | null;
    emergencyContact: string | null;
    insurance: boolean | null;
    someAllergy: boolean | null;
    allergyDetails: string | null;
    skills: string[] | null;
    interests: string[] | null;
    currentActivities: string | null;
    bio: string | null;
    discordNickname: string | null;
    discordRoles: string[] | null;
};

export type ReactionUsersByEmoji = {
    emoji: string;
    count: number;
    users: CommunityReactionUser[];
};

// What a reaction badge renders. The full record — including the private
// member fields — is returned once per member in `members`, so it is not
// repeated here for every emoji the same member reacted with.
export type ReactionParticipant = {
    discordUserId: string;
    discordUsername: string;
    discordGlobalName: string | null;
    memberName: string | null;
    displayName: string | null;
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
    memberStatus: MemberStatus | null;
    displayGrade: string | null;
    studentId: string | null;
    studentEmail: string | null;
    emergencyContact: string | null;
    insurance: boolean | null;
    someAllergy: boolean | null;
    allergyDetails: string | null;
    skills: string[];
    interests: string[];
    currentActivities: string | null;
    bio: string | null;
    discordNickname: string | null;
    discordRoles: string[];
    reactions: string[];
};

export const collectDiscordUserIds = (reactionUsersByEmoji: ReactionUsersByEmoji[]) => (
    Array.from(new Set(
        reactionUsersByEmoji.flatMap((reaction) => reaction.users.map((user) => user.id))
    ))
);

export const buildMessageReactionSummary = (
    eventMessage: EventMessageRecord,
    discordMessage: CommunityMessage,
    reactionUsersByEmoji: ReactionUsersByEmoji[],
    linkedUsers: LinkedReactionUser[],
) => {
    const linkedUserMap = new Map(
        linkedUsers.map((user) => [user.discordUserId, user])
    );
    const memberMap = new Map<string, ReactionMember>();

    const reactions = reactionUsersByEmoji.map((reaction) => {
        const users = reaction.users.map((discordUser) => {
            const linkedUser = linkedUserMap.get(discordUser.id);
            const reactionMember: ReactionMember = {
                discordUserId: discordUser.id,
                discordUsername: discordUser.username,
                discordGlobalName: discordUser.displayName,
                userId: linkedUser?.userId ?? null,
                userName: linkedUser?.userName ?? null,
                displayName: linkedUser?.displayName ?? null,
                email: linkedUser?.email ?? null,
                memberId: linkedUser?.memberId ?? null,
                memberName: linkedUser?.memberName ?? null,
                memberStatus: linkedUser?.memberStatus ?? null,
                displayGrade: linkedUser?.displayGrade ?? null,
                studentId: linkedUser?.studentId ?? null,
                studentEmail: linkedUser?.studentEmail ?? null,
                emergencyContact: linkedUser?.emergencyContact ?? null,
                insurance: linkedUser?.insurance ?? null,
                someAllergy: linkedUser?.someAllergy ?? null,
                allergyDetails: linkedUser?.allergyDetails ?? null,
                skills: linkedUser?.skills ?? [],
                interests: linkedUser?.interests ?? [],
                currentActivities: linkedUser?.currentActivities ?? null,
                bio: linkedUser?.bio ?? null,
                discordNickname: linkedUser?.discordNickname ?? null,
                discordRoles: linkedUser?.discordRoles ?? [],
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

            const participant: ReactionParticipant = {
                discordUserId: reactionMember.discordUserId,
                discordUsername: reactionMember.discordUsername,
                discordGlobalName: reactionMember.discordGlobalName,
                memberName: reactionMember.memberName,
                displayName: reactionMember.displayName,
            };
            return participant;
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
