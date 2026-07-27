import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventDetailViewModel, formatEventDate, EventReactionSummary } from './detailUtils';

const summary: EventReactionSummary = {
  eventMessage: {
    id: 'event-1',
    channelId: '123456789012345678',
    messageId: '223456789012345678',
    content: '参加確認\n集合時間は9時',
    createdBy: 'admin-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
  reactions: [
    {
      emoji: '✅',
      count: 2,
      // Badges carry names only; the private fields arrive once in `members`.
      users: [
        {
          discordUserId: '323456789012345678',
          discordUsername: 'taro',
          discordGlobalName: 'Taro',
          memberName: '山田 太郎',
          displayName: '太郎',
        },
        {
          discordUserId: '423456789012345678',
          discordUsername: 'hanako',
          discordGlobalName: null,
          memberName: null,
          displayName: null,
        },
      ],
    },
  ],
  members: [
    {
      discordUserId: '323456789012345678',
      discordUsername: 'taro',
      discordGlobalName: 'Taro',
      userId: 'user-1',
      userName: 'taro-account',
      displayName: '太郎',
      email: 'account@example.com',
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
      reactions: ['✅', '🍱'],
    },
    {
      discordUserId: '423456789012345678',
      discordUsername: 'hanako',
      discordGlobalName: null,
      userId: null,
      userName: null,
      displayName: null,
      email: null,
      memberId: null,
      memberName: null,
      memberStatus: null,
      displayGrade: null,
      studentId: null,
      studentEmail: null,
      emergencyContact: null,
      insurance: null,
      someAllergy: null,
      allergyDetails: null,
      skills: [],
      interests: [],
      currentActivities: null,
      bio: null,
      discordNickname: null,
      discordRoles: [],
      reactions: ['✅'],
    },
  ],
};

test('formatEventDate formats valid dates and preserves invalid values', () => {
  assert.match(formatEventDate('2026-07-01T00:00:00Z'), /2026/);
  assert.equal(formatEventDate('not-a-date'), 'not-a-date');
});

test('buildEventDetailViewModel maps selected event details, reaction users, and personal fields for display', () => {
  const viewModel = buildEventDetailViewModel(summary);

  assert.equal(viewModel.eventTitle, 'イベント通知メッセージ (223456789012345678)');
  assert.equal(viewModel.eventContent, '参加確認\n集合時間は9時');
  assert.deepEqual(viewModel.reactionBadges, [{
    emoji: '✅',
    count: 2,
    names: ['山田 太郎', 'hanako'],
  }]);
  assert.deepEqual(viewModel.membersWithReactions[0], {
    name: '山田 太郎',
    registeredName: '山田 太郎',
    displayName: '太郎',
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
    memberId: 'member-1',
    discordUserId: '323456789012345678',
    discordUsername: 'taro',
    discordGlobalName: 'Taro',
    discordNickname: 'たろう',
    discordRoles: ['Member', 'Developer'],
    userId: 'user-1',
    email: 'account@example.com',
    reactions: ['✅', '🍱'],
  });
  assert.equal(viewModel.membersWithReactions[1].name, 'hanako');
});
