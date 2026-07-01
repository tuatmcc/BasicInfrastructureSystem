import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildMessageReactionSummary,
    collectDiscordUserIds,
    EventMessageRecord,
    LinkedReactionUser,
    ReactionUsersByEmoji,
} from './reactions';
import type { DiscordMessage } from '../../lib/community/type';

const eventMessage: EventMessageRecord = {
    id: 'event-1',
    channelId: '123456789012345678',
    messageId: '223456789012345678',
    content: '参加確認',
    createdBy: 'admin-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
};

const discordMessage: DiscordMessage = {
    id: eventMessage.messageId,
    channelId: eventMessage.channelId,
    content: eventMessage.content,
    createdAt: eventMessage.createdAt,
    author: {
        id: '323456789012345678',
        username: 'bot',
        globalName: null,
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
            { id: '423456789012345678', username: 'taro', globalName: 'Taro', bot: false },
            { id: '523456789012345678', username: 'hanako', globalName: null, bot: false },
        ],
    },
    {
        emoji: '🍱',
        count: 1,
        users: [
            { id: '423456789012345678', username: 'taro', globalName: 'Taro', bot: false },
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
        displayGrade: 'B2',
        studentId: 'S001',
        studentEmail: 'taro@example.edu',
        emergencyContact: '090-0000-0000',
        insurance: true,
        someAllergy: false,
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
    assert.deepEqual(summary.reactions[0].users[0], {
        discordUserId: '423456789012345678',
        discordUsername: 'taro',
        discordGlobalName: 'Taro',
        userId: 'user-1',
        userName: 'taro-account',
        displayName: '太郎',
        email: 'taro-account@example.com',
        memberId: 'member-1',
        memberName: '山田 太郎',
        displayGrade: 'B2',
        studentId: 'S001',
        studentEmail: 'taro@example.edu',
        emergencyContact: '090-0000-0000',
        insurance: true,
        someAllergy: false,
        reactions: ['✅'],
    });
    assert.deepEqual(summary.reactions[0].users[1], {
        discordUserId: '523456789012345678',
        discordUsername: 'hanako',
        discordGlobalName: null,
        userId: null,
        userName: null,
        displayName: null,
        email: null,
        memberId: null,
        memberName: null,
        displayGrade: null,
        studentId: null,
        studentEmail: null,
        emergencyContact: null,
        insurance: null,
        someAllergy: null,
        reactions: ['✅'],
    });
    assert.deepEqual(summary.members.find(member => member.discordUserId === '423456789012345678')?.reactions, ['✅', '🍱']);
    assert.equal(summary.members.length, 2);
});
