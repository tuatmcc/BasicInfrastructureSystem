import Link from 'next/link'

type AdminMemberHeaderProps = {
  eyebrow: string
  title: string
  description: string
}

export default function AdminMemberHeader({ eyebrow, title, description }: AdminMemberHeaderProps) {
  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-zinc-400">{description}</p>
        </div>
        <Link href="/" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
          Dashboard
        </Link>
      </div>

      <nav aria-label="部員管理" className="flex flex-wrap gap-2">
        <Link href="/admin/applications" className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50">
          入部申請
        </Link>
        <Link href="/admin/members" className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50">
          部員台帳
        </Link>
        <Link href="/members" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          一般部員向け台帳
        </Link>
      </nav>

      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
        この画面には学籍番号・学生メール・緊急連絡先・健康情報が含まれます。必要な運用目的に限って閲覧してください。
      </div>
    </header>
  )
}
