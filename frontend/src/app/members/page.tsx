'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import {
  filterDirectoryEntries,
  toSafeDirectoryEntry,
  type DirectoryEntry,
} from './directoryUtils'

const DirectoryCard = ({ entry }: { entry: DirectoryEntry }) => (
  <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold text-slate-950 dark:text-white">{entry.displayName}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{entry.displayGrade}</p>
      </div>
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
        {entry.gradeCode}
      </span>
    </div>

    {entry.bio && (
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-zinc-300">{entry.bio}</p>
    )}

    {entry.currentActivities && (
      <div className="mt-5 rounded-xl bg-slate-50 p-3 dark:bg-zinc-950/60">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">現在の活動</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-zinc-300">{entry.currentActivities}</p>
      </div>
    )}

    <div className="mt-5 space-y-4">
      {entry.skills.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Skills</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.skills.map((skill) => (
              <span key={skill} className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {entry.interests.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.interests.map((interest) => (
              <span key={interest} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {entry.communities.length > 0 && (
      <div className="mt-auto pt-5">
        <div className="border-t border-slate-100 pt-4 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Community</p>
          <div className="mt-2 space-y-2">
            {entry.communities.map((community) => (
              <div key={`${community.provider}:${community.communityId}`} className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                <span className="font-semibold capitalize">{community.provider}</span>
                {community.nickname && <span>{community.nickname}</span>}
                {community.roles.map((role) => (
                  <span key={role} className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{role}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </article>
)

export default function MemberDirectoryPage() {
  const [query, setQuery] = useState('')
  const { data: entries = [], isLoading, error, refetch } = useQuery({
    queryKey: ['member-directory'],
    queryFn: async () => {
      const response = await client.api.v0.member.directory.$get()
      const status = response.status as number
      if (status === 403) {
        throw new Error('部員台帳は承認済みの部員だけが閲覧できます。')
      }
      if (!response.ok) {
        throw new Error(`部員台帳の取得に失敗しました: ${status}`)
      }

      const payload = await response.json()
      return payload.map((entry) => toSafeDirectoryEntry(entry))
    },
  })

  const filteredEntries = filterDirectoryEntries(entries, query)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 md:px-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Member directory</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">部員台帳</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
              公開に同意したプロフィールだけを表示しています。連絡先・学籍情報・健康情報は含みません。
            </p>
          </div>
          <Link href="/me" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
            自分の情報
          </Link>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <label htmlFor="directory-search" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Search
          </label>
          <input
            id="directory-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前、スキル、興味、Discordロールで検索"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
          />
        </section>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">台帳を読み込んでいます…</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            <p className="font-semibold">{error instanceof Error ? error.message : '部員台帳を取得できませんでした。'}</p>
            <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">再試行</button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-semibold text-slate-700 dark:text-zinc-200">該当する公開プロフィールはありません。</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">検索条件を変えるか、公開プロフィールが追加されるまでお待ちください。</p>
          </div>
        ) : (
          <section aria-label="公開部員プロフィール" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredEntries.map((entry) => <DirectoryCard key={entry.memberId} entry={entry} />)}
          </section>
        )}
      </main>
    </div>
  )
}
