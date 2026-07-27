'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { communityClient } from '@/lib/client'

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

const getMessageTitle = (content: string) => content.split('\n')[0] || 'イベント通知メッセージ'

export default function AdminDashboardPage() {
  const { data: eventMessages = [], isLoading, error } = useQuery({
    queryKey: ['admin-event-messages'],
    queryFn: async () => {
      const res = await communityClient.api.v0.message.$get()
      if (!res.ok) {
        throw new Error(`Event message API Error: ${res.status}`)
      }
      return res.json()
    },
  })

  const latestMessages = eventMessages.slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">イベント通知と部員情報の管理状況を確認します。</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/applications" className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700">
              入部申請
            </Link>
            <Link href="/admin/members" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              管理者台帳
            </Link>
            <Link href="/members" className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50">
              一般部員台帳
            </Link>
            <Link href="/event" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              イベント一覧
            </Link>
            <Link href="/me" className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50">
              自分の情報
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Event messages</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{eventMessages.length}</p>
            <p className="text-sm text-gray-500 mt-1">保存済みイベント通知</p>
          </section>
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Latest event</p>
            <p className="text-lg font-semibold text-gray-900 mt-2 truncate">
              {latestMessages[0] ? getMessageTitle(latestMessages[0].content) : '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {latestMessages[0] ? formatDate(latestMessages[0].createdAt) : 'まだ通知はありません'}
            </p>
          </section>
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Membership</p>
            <p className="text-lg font-semibold text-gray-900 mt-2">申請 → Discord再確認 → 承認</p>
            <p className="text-sm text-gray-500 mt-1">申請一覧から審査できます</p>
          </section>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近のイベント通知</h2>
            <Link href="/event" className="text-sm text-blue-600 hover:underline font-medium">
              すべて見る
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading events...</div>
          ) : error ? (
            <div className="p-6 text-red-700 bg-red-50 border-t border-red-100">
              {error instanceof Error ? error.message : 'イベント通知の取得に失敗しました。'}
            </div>
          ) : latestMessages.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {latestMessages.map((message) => (
                <Link
                  key={message.id}
                  href={`/event/${message.id}`}
                  className="block px-5 py-4 hover:bg-gray-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{getMessageTitle(message.content)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Message: {message.messageId} / Channel: {message.channelId}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(message.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">保存済みのイベント通知はありません。</div>
          )}
        </section>
      </div>
    </div>
  )
}
