'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import AdminMemberHeader from './AdminMemberHeader'
import AdminMemberTable from './AdminMemberTable'
import {
  MemberApiError,
  memberStatusLabels,
  memberStatuses,
  readMemberApiError,
  type AdminMemberPage,
  type MemberStatus,
} from '../_lib/adminMemberUtils'

type AdminMemberListProps = {
  fixedStatus?: MemberStatus
  title: string
  description: string
  eyebrow: string
}

export default function AdminMemberList({ fixedStatus, title, description, eyebrow }: AdminMemberListProps) {
  const [selectedStatus, setSelectedStatus] = useState<MemberStatus | ''>(fixedStatus ?? '')
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined])
  const currentCursor = cursorStack[cursorStack.length - 1]
  const effectiveStatus = (fixedStatus ?? selectedStatus) || undefined

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-members', effectiveStatus ?? 'all', currentCursor ?? 'first'],
    queryFn: async () => {
      const response = await client.api.v0.member.$get({
        query: {
          status: effectiveStatus,
          limit: 50,
          cursor: currentCursor,
        },
      })
      if (response.status !== 200) {
        throw await readMemberApiError(response, '部員台帳の取得に失敗しました')
      }
      return await response.json() as AdminMemberPage
    },
    placeholderData: keepPreviousData,
  })

  const handleStatusChange = (status: MemberStatus | '') => {
    setSelectedStatus(status)
    setCursorStack([undefined])
  }

  const goNext = () => {
    if (!data?.nextCursor) return
    setCursorStack((stack) => [...stack, data.nextCursor ?? undefined])
  }

  const goPrevious = () => {
    setCursorStack((stack) => stack.length > 1 ? stack.slice(0, -1) : stack)
  }

  const errorMessage = error instanceof MemberApiError && error.status === 403
    ? '管理者権限がないため、この台帳は閲覧できません。'
    : error instanceof Error ? error.message : null

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 md:px-8">
      <main className="mx-auto max-w-7xl space-y-6">
        <AdminMemberHeader eyebrow={eyebrow} title={title} description={description} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{data?.items.length ?? 0}件を表示</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">1ページ最大50件 / 機密情報は加工せず表示</p>
            </div>

            {!fixedStatus && (
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-600 dark:text-zinc-300">状態</span>
                <select
                  value={selectedStatus}
                  onChange={(event) => handleStatusChange(event.target.value as MemberStatus | '')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <option value="">すべて</option>
                  {memberStatuses.map((status) => <option key={status} value={status}>{memberStatusLabels[status]}</option>)}
                </select>
              </label>
            )}
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-zinc-400">台帳を読み込んでいます…</div>
          ) : errorMessage ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <p className="font-semibold">{errorMessage}</p>
              <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">再試行</button>
            </div>
          ) : (
            <AdminMemberTable items={data?.items ?? []} />
          )}

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={goPrevious}
              disabled={cursorStack.length === 1 || isFetching}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
            >
              前へ
            </button>
            <span className="text-xs text-slate-500 dark:text-zinc-400">ページ {cursorStack.length}{isFetching ? ' / 更新中…' : ''}</span>
            <button
              type="button"
              onClick={goNext}
              disabled={!data?.nextCursor || isFetching}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-950"
            >
              次へ
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
