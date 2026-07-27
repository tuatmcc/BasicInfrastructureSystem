import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/table-core';
import {
  buildReactionMembersCsv,
  matchesMemberTableFilter,
  ReactionMemberRow,
} from './memberTableUtils';

const rows: ReactionMemberRow[] = [
  {
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
    discordUserId: '123456789012345678',
    discordUsername: 'taro',
    discordGlobalName: 'Taro Yamada',
    discordNickname: 'たろう',
    discordRoles: ['Member', 'Developer'],
    userId: 'user-1',
    email: 'account@example.com',
    reactions: ['✅', '🍱'],
  },
  {
    name: '佐藤 "花子"',
    registeredName: '佐藤 "花子"',
    displayName: '花子',
    memberStatus: 'active',
    displayGrade: 'M1',
    studentId: 'S002',
    studentEmail: 'hanako@example.edu',
    emergencyContact: '080-0000-0000',
    insurance: false,
    someAllergy: true,
    allergyDetails: 'Peanuts',
    skills: ['Design'],
    interests: ['UI'],
    currentActivities: 'Website redesign',
    bio: 'Designer',
    memberId: 'member-2',
    discordUserId: '223456789012345678',
    discordUsername: 'hanako',
    discordGlobalName: null,
    discordNickname: null,
    discordRoles: ['Member'],
    userId: 'user-2',
    email: 'hanako-account@example.com',
    reactions: ['❌'],
  },
];

test('matchesMemberTableFilter supports text, array, exact, and boolean filters', () => {
  assert.equal(matchesMemberTableFilter(rows[0].name, { operator: 'contains', value: '山田' }), true);
  assert.equal(matchesMemberTableFilter(rows[0].displayGrade, { operator: 'equals', value: 'b2' }), true);
  assert.equal(matchesMemberTableFilter(rows[0].reactions, { operator: 'contains', value: '🍱' }), true);
  assert.equal(matchesMemberTableFilter(rows[0].insurance, { operator: 'is', value: 'true' }), true);
  assert.equal(matchesMemberTableFilter(rows[1].insurance, { operator: 'is', value: 'true' }), false);
  assert.equal(matchesMemberTableFilter(null, { operator: 'contains', value: 'x' }), false);
});

test('buildReactionMembersCsv exports visible reaction members with personal fields', () => {
  const csv = buildReactionMembersCsv(rows);

  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /"名前","公開表示名","部員状態","学年","学籍番号","学生メール"/);
  assert.match(csv, /"山田 太郎","太郎","active","B2","S001"/);
  assert.match(csv, /"TypeScript","Robotics","Robot controller","Embedded developer","たろう","Member Developer"/);
  assert.match(csv, /"佐藤 ""花子""","花子","active","M1","S002"/);
  assert.match(csv, /"Peanuts","Design","UI","Website redesign","Designer"/);
});

test('buildReactionMembersCsv neutralizes spreadsheet formulas in user-controlled fields', () => {
  const dangerousRow: ReactionMemberRow = {
    ...rows[0],
    name: '=HYPERLINK("https://example.invalid","click")',
    skills: ['  +SUM(1,1)'],
    bio: '\t@malicious',
    discordNickname: '-2+3',
  };

  const csv = buildReactionMembersCsv([dangerousRow]);

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid"",""click""\)"/);
  assert.match(csv, /"'  \+SUM\(1,1\)"/);
  assert.match(csv, /"'\t@malicious"/);
  assert.match(csv, /"'-2\+3"/);
  assert.doesNotMatch(csv, /(?:^|,)"\s*[=+\-@]/m);
});

test('TanStack sorting orders reaction member rows by configured table columns', () => {
  const table = createTable({
    data: rows,
    columns: [
      { accessorKey: 'displayGrade' },
      { accessorKey: 'name' },
    ],
    state: {
      sorting: [{ id: 'displayGrade', desc: true }],
    },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  assert.deepEqual(
    table.getRowModel().rows.map(row => row.original.displayGrade),
    ['M1', 'B2'],
  );
});
