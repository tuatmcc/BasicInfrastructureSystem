export type ReactionMemberRow = {
  name: string;
  displayGrade: string | null;
  studentId: string | null;
  studentEmail: string | null;
  emergencyContact: string | null;
  insurance: boolean | null;
  someAllergy: boolean | null;
  memberId: string | null;
  discordUserId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  userId: string | null;
  email: string | null;
  reactions: string[];
};

export type MemberTableFilterOperator = 'contains' | 'equals' | 'is';

export type MemberTableFilterValue = {
  operator: MemberTableFilterOperator;
  value: string;
};

export const matchesMemberTableFilter = (
  rowValue: unknown,
  filterValue: MemberTableFilterValue,
) => {
  const { operator, value } = filterValue;

  if (rowValue === undefined || rowValue === null) return false;

  if (operator === 'contains') {
    if (Array.isArray(rowValue)) {
      return rowValue.some(item => String(item).toLowerCase().includes(value.toLowerCase()));
    }
    return String(rowValue).toLowerCase().includes(value.toLowerCase());
  }

  if (operator === 'equals') {
    return String(rowValue).toLowerCase() === value.toLowerCase();
  }

  if (operator === 'is') {
    const targetBool = value === 'true';
    return Boolean(rowValue) === targetBool;
  }

  return true;
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildReactionMembersCsv = (rows: ReactionMemberRow[]) => {
  const headers = [
    '名前',
    '学年',
    '学籍番号',
    '学生メール',
    '緊急連絡先',
    '保険加入',
    'アレルギー',
    'Discordユーザー名',
    'DiscordユーザーID',
    'リアクション',
    'メンバーID',
    'ユーザーID',
  ];

  const csvRows = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => {
    csvRows.push([
      row.name,
      row.displayGrade,
      row.studentId,
      row.studentEmail,
      row.emergencyContact,
      row.insurance === null ? '' : row.insurance ? '加入' : '未加入',
      row.someAllergy === null ? '' : row.someAllergy ? 'あり' : 'なし',
      row.discordGlobalName || row.discordUsername,
      row.discordUserId,
      row.reactions.join(' '),
      row.memberId,
      row.userId,
    ].map(csvEscape).join(','));
  });

  return `\ufeff${csvRows.join('\n')}`;
};
