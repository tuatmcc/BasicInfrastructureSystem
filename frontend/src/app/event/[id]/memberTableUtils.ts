export type ReactionMemberRow = {
  name: string;
  registeredName: string | null;
  displayName: string | null;
  memberStatus: 'pending' | 'active' | 'rejected' | 'withdrawn' | null;
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
  memberId: string | null;
  discordUserId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordNickname: string | null;
  discordRoles: string[];
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

const CSV_FORMULA_PREFIX = /^\s*[=+\-@]/u;
const CSV_CONTROL_PREFIX = /^[\t\r\n]/u;

const csvEscape = (value: unknown) => {
  const raw = String(value ?? '');
  // Spreadsheet applications may execute user-controlled cells as formulas,
  // even when the CSV field is quoted. Prefix formula-like values with an
  // apostrophe before applying normal RFC 4180 quote escaping.
  const safe = CSV_FORMULA_PREFIX.test(raw) || CSV_CONTROL_PREFIX.test(raw)
    ? `'${raw}`
    : raw;

  return `"${safe.replace(/"/g, '""')}"`;
};

export const buildReactionMembersCsv = (rows: ReactionMemberRow[]) => {
  const headers = [
    '名前',
    '公開表示名',
    '部員状態',
    '学年',
    '学籍番号',
    '学生メール',
    '緊急連絡先',
    '保険加入',
    'アレルギー',
    'アレルギー詳細',
    'スキル',
    '興味',
    '現在の活動',
    '自己紹介',
    'Discordニックネーム',
    'Discordロール',
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
      row.displayName,
      row.memberStatus,
      row.displayGrade,
      row.studentId,
      row.studentEmail,
      row.emergencyContact,
      row.insurance === null ? '' : row.insurance ? '加入' : '未加入',
      row.someAllergy === null ? '' : row.someAllergy ? 'あり' : 'なし',
      row.allergyDetails,
      row.skills.join(' '),
      row.interests.join(' '),
      row.currentActivities,
      row.bio,
      row.discordNickname,
      row.discordRoles.join(' '),
      row.discordGlobalName || row.discordUsername,
      row.discordUserId,
      row.reactions.join(' '),
      row.memberId,
      row.userId,
    ].map(csvEscape).join(','));
  });

  return `\ufeff${csvRows.join('\n')}`;
};
