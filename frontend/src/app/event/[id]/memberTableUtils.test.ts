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
    displayGrade: 'B2',
    studentId: 'S001',
    studentEmail: 'taro@example.edu',
    emergencyContact: '090-0000-0000',
    insurance: true,
    someAllergy: false,
    memberId: 'member-1',
    discordUserId: '123456789012345678',
    discordUsername: 'taro',
    discordGlobalName: 'Taro Yamada',
    userId: 'user-1',
    email: 'account@example.com',
    reactions: ['✅', '🍱'],
  },
  {
    name: '佐藤 "花子"',
    displayGrade: 'M1',
    studentId: 'S002',
    studentEmail: 'hanako@example.edu',
    emergencyContact: '080-0000-0000',
    insurance: false,
    someAllergy: true,
    memberId: 'member-2',
    discordUserId: '223456789012345678',
    discordUsername: 'hanako',
    discordGlobalName: null,
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
  assert.match(csv, /"名前","学年","学籍番号","学生メール","緊急連絡先","保険加入","アレルギー"/);
  assert.match(csv, /"山田 太郎","B2","S001","taro@example.edu","090-0000-0000","加入","なし","Taro Yamada","123456789012345678","✅ 🍱","member-1","user-1"/);
  assert.match(csv, /"佐藤 ""花子""","M1","S002","hanako@example.edu","080-0000-0000","未加入","あり","hanako","223456789012345678","❌","member-2","user-2"/);
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
