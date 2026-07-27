import type { ReactionMemberRow } from './memberTableUtils'

const statusLabels: Record<NonNullable<ReactionMemberRow['memberStatus']>, string> = {
  pending: '審査中',
  active: '承認済み',
  rejected: '却下',
  withdrawn: '退部・取下げ',
}

const show = (value: string | null | undefined) => value?.trim() || '-'

const Tags = ({ values }: { values: string[] }) => (
  values.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {values.map(value => (
        <span key={value} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
          {value}
        </span>
      ))}
    </div>
  ) : <span>-</span>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">{label}</dt>
    <dd className="break-words text-sm text-slate-800 dark:text-zinc-200">{children}</dd>
  </div>
)

export default function ReactionMemberProfile({ member }: { member: ReactionMemberRow }) {
  if (!member.memberId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
        このDiscordアカウントは部員プロフィールに連携されていません。
        <div className="mt-2 text-xs">Discord: {member.discordGlobalName || member.discordUsername} ({member.discordUserId})</div>
      </div>
    )
  }

  return (
    <dl className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-950/60">
      <Field label="登録氏名">{show(member.registeredName)}</Field>
      <Field label="公開表示名">{show(member.displayName)}</Field>
      <Field label="部員状態">{member.memberStatus ? statusLabels[member.memberStatus] : '-'}</Field>
      <Field label="学年">{show(member.displayGrade)}</Field>
      <Field label="学籍番号">{show(member.studentId)}</Field>
      <Field label="学生メール">{show(member.studentEmail)}</Field>
      <Field label="認証メール">{show(member.email)}</Field>
      <Field label="緊急連絡先">{show(member.emergencyContact)}</Field>
      <Field label="保険">{member.insurance === null ? '-' : member.insurance ? '加入' : '未加入'}</Field>
      <Field label="アレルギー">{member.someAllergy === null ? '-' : member.someAllergy ? 'あり' : 'なし'}</Field>
      <Field label="アレルギー詳細">{show(member.allergyDetails)}</Field>
      <Field label="スキル"><Tags values={member.skills} /></Field>
      <Field label="興味"><Tags values={member.interests} /></Field>
      <Field label="現在の活動">{show(member.currentActivities)}</Field>
      <Field label="自己紹介">{show(member.bio)}</Field>
      <Field label="Discordニックネーム">{show(member.discordNickname)}</Field>
      <Field label="Discordユーザー名">{member.discordUsername}</Field>
      <Field label="Discordロール"><Tags values={member.discordRoles} /></Field>
      <Field label="リアクション"><Tags values={member.reactions} /></Field>
      <Field label="内部参照">Member {member.memberId} / User {show(member.userId)}</Field>
    </dl>
  )
}
