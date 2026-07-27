import Link from 'next/link'
import MemberStatusBadge from './MemberStatusBadge'
import { formatMemberDate, type AdminMember } from '../_lib/adminMemberUtils'

export default function AdminMemberTable({ items }: { items: AdminMember[] }) {
  if (items.length === 0) {
    return <div className="p-10 text-center text-sm text-slate-500 dark:text-zinc-400">該当する部員・申請はありません。</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-semibold">状態</th>
            <th className="px-4 py-3 font-semibold">登録氏名</th>
            <th className="px-4 py-3 font-semibold">学年</th>
            <th className="px-4 py-3 font-semibold">学籍番号</th>
            <th className="px-4 py-3 font-semibold">学生メール</th>
            <th className="px-4 py-3 font-semibold">申請日時</th>
            <th className="px-4 py-3 text-right font-semibold">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {items.map((member) => (
            <tr key={member.memberId} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50">
              <td className="whitespace-nowrap px-4 py-4"><MemberStatusBadge status={member.memberStatus} /></td>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950 dark:text-white">{member.name}</td>
              <td className="whitespace-nowrap px-4 py-4">{member.displayGrade}</td>
              <td className="whitespace-nowrap px-4 py-4 font-mono text-xs">{member.studentId}</td>
              <td className="whitespace-nowrap px-4 py-4">{member.studentEmail}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500 dark:text-zinc-400">{formatMemberDate(member.submittedAt)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-right">
                <Link href={`/admin/members/${member.memberId}`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

