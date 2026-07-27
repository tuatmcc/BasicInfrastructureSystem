import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildMessageReactionSummary,
    collectDiscordUserIds,
    EventMessageRecord,
    LinkedReactionUser,
    ReactionUsersByEmoji,
} from './reactions';
import type { CommunityMessage } from '../../lib/community/type';

const eventMessage: EventMessageRecord = {
    id: 'event-1',
    channelId: '123456789012345678',
    messageId: '223456789012345678',
    content: '参加確認',
    createdBy: 'admin-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
};

const discordMessage: CommunityMessage = {
    id: eventMessage.messageId,
    channelId: eventMessage.channelId,
    content: eventMessage.content,
    createdAt: eventMessage.createdAt,
    author: {
        id: '323456789012345678',
        username: 'bot',
        displayName: null,
        bot: true,
    },
    reactions: [
        { emoji: '✅', count: 2 },
        { emoji: '🍱', count: 1 },
    ],
};

const reactionUsersByEmoji: ReactionUsersByEmoji[] = [
    {
        emoji: '✅',
        count: 2,
        users: [
            { id: '423456789012345678', username: 'taro', displayName: 'Taro', bot: false },
            { id: '523456789012345678', username: 'hanako', displayName: null, bot: false },
        ],
    },
    {
        emoji: '🍱',
        count: 1,
        users: [
            { id: '423456789012345678', username: 'taro', displayName: 'Taro', bot: false },
        ],
    },
];

const linkedUsers: LinkedReactionUser[] = [
    {
        discordUserId: '423456789012345678',
        userId: 'user-1',
        userName: 'taro-account',
        displayName: '太郎',
        email: 'taro-account@example.com',
        memberId: 'member-1',
        memberName: '山田 太郎',
        memberStatus: 'active',
        displayGrade: 'B2',
        studentId: 'S001',
        studentEmail: 'taro@example.edu',
        emergencyContact: '090-0000-0000',
        insurance: true,
        someAllergy: false,
        allergyDetails: null,
        skills: ['TypeScript'],
        interests: ['Robotics'],
        currentActivities: 'Robot controller',
        bio: 'Embedded developer',
        discordNickname: 'たろう',
        discordRoles: ['Member', 'Developer'],
    },
];

test('collectDiscordUserIds deduplicates users across reactions', () => {
    assert.deepEqual(collectDiscordUserIds(reactionUsersByEmoji), [
        '423456789012345678',
        '523456789012345678',
    ]);
});

test('buildMessageReactionSummary includes reaction users, linked personal information, and merged member reactions', () => {
    const summary = buildMessageReactionSummary(
        eventMessage,
        discordMessage,
        reactionUsersByEmoji,
        linkedUsers,
    );

    assert.equal(summary.eventMessage.id, 'event-1');
    assert.equal(summary.discordMessage.id, '223456789012345678');
    assert.equal(summary.reactions.length, 2);
    // A reaction badge only needs names. The private member fields must not be
    // repeated here for every emoji the member reacted with.
    assert.deepEqual(summary.reactions[0].users[0], {
        discordUserId: '423456789012345678',
        discordUsername: 'taro',
        discordGlobalName: 'Taro',
        memberName: '山田 太郎',
        displayName: '太郎',
    });
    assert.deepEqual(summary.reactions[0].users[1], {
        discordUserId: '523456789012345678',
        discordUsername: 'hanako',
        discordGlobalName: null,
        memberName: null,
        displayName: null,
    });
    assert.deepEqual(summary.members.find(member => member.discordUserId === '423456789012345678')?.reactions, ['✅', '🍱']);
    assert.equal(summary.members.length, 2);

    // The member list stays complete: it is what the admin table and its CSV
    // export read, including the private fields the organiser needs.
    const taro = summary.members.find(member => member.discordUserId === '423456789012345678');
    assert.equal(taro?.emergencyContact, '090-0000-0000');
    assert.equal(taro?.studentId, 'S001');
});

test('private member fields are never repeated inside the reaction badges', () => {
    const summary = buildMessageReactionSummary(
        eventMessage,
        discordMessage,
        reactionUsersByEmoji,
        linkedUsers,
    );

    const serialisedBadges = JSON.stringify(summary.reactions);
    for (const secret of ['090-0000-0000', 'S001', 'taro@example.edu', 'taro-account@example.com']) {
        assert.equal(
            serialisedBadges.includes(secret),
            false,
            `reaction badges must not carry ${secret}`,
        );
    }
});
