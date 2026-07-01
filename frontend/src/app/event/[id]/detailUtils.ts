import type { ReactionMemberRow } from './memberTableUtils';

export type EventReactionSummary = {
  eventMessage: {
    id: string;
    channelId: string;
    messageId: string;
    content: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
  reactions: Array<{
    emoji: string;
    count: number;
    users: Array<ReactionSummaryMember>;
  }>;
  members: Array<ReactionSummaryMember>;
};

export type ReactionSummaryMember = {
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

export const formatEventDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
};

const getDisplayName = (member: Pick<ReactionSummaryMember, 'memberName' | 'displayName' | 'discordGlobalName' | 'discordUsername'>) => (
  member.memberName ||
  member.displayName ||
  member.discordGlobalName ||
  member.discordUsername
);

export const buildEventDetailViewModel = (summary: EventReactionSummary) => ({
  eventTitle: `イベント通知メッセージ (${summary.eventMessage.messageId})`,
  eventContent: summary.eventMessage.content,
  eventDate: formatEventDate(summary.eventMessage.createdAt),
  reactionBadges: summary.reactions.map((reaction) => ({
    emoji: reaction.emoji,
    count: reaction.count,
    names: reaction.users.map(getDisplayName),
  })),
  membersWithReactions: summary.members.map<ReactionMemberRow>((member) => ({
    name: getDisplayName(member),
    displayGrade: member.displayGrade,
    studentId: member.studentId,
    studentEmail: member.studentEmail,
    emergencyContact: member.emergencyContact,
    insurance: member.insurance,
    someAllergy: member.someAllergy,
    memberId: member.memberId,
    discordUserId: member.discordUserId,
    discordUsername: member.discordUsername,
    discordGlobalName: member.discordGlobalName,
    userId: member.userId,
    email: member.email,
    reactions: member.reactions,
  })),
});
