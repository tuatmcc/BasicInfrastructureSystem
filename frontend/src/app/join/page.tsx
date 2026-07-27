'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import DiscordAccountLink from './DiscordAccountLink'
import JoinApplicationForm from './JoinApplicationForm'

export default function JoinPage() {
  const router = useRouter()
  const [discordVerified, setDiscordVerified] = useState(false)

  const {
    data: existingMember,
    isLoading: isMemberLoading,
    error: memberError,
    refetch: refetchMember,
  } = useQuery({
    queryKey: ['member'],
    queryFn: async () => {
      const response = await client.api.v0.member.me.$get()
      const status = response.status as number
      if (status === 404) return null
      if (status === 401) throw new Error('ログイン状態を確認できません。再ログインしてください。')
      if (!response.ok) throw new Error(`Member API Error: ${status}`)
      return response.json()
    },
    retry: false,
  })

  const { data: grades = [], isLoading: isGradesLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const response = await client.api.v0.grade.$get()
      if (!response.ok) throw new Error(`Grade API Error: ${response.status}`)
      return response.json()
    },
  })

  useEffect(() => {
    if (existingMember?.memberStatus === 'active') router.replace('/me')
  }, [existingMember?.memberStatus, router])

  const formKey = existingMember
    ? `${existingMember.memberId}:${existingMember.applicationVersion}`
    : 'new-application'

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">入部申請</h1>
          <p className="mt-1 text-gray-500">Discord本人確認後に申請し、管理者の承認を待ちます。</p>
        </header>

        {isMemberLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            申請状態を確認しています…
          </div>
        ) : memberError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p className="font-semibold">申請状態を取得できませんでした。</p>
            <p className="mt-1">{memberError instanceof Error ? memberError.message : '不明なエラーです。'}</p>
            <button type="button" onClick={() => refetchMember()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
              再試行
            </button>
          </div>
        ) : existingMember?.memberStatus === 'active' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            承認済みです。会員ページへ移動しています…
          </div>
        ) : (
          <>
            {existingMember?.memberStatus === 'pending' && (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                申請は審査中です。内容を修正して保存できます。
              </div>
            )}
            {existingMember?.memberStatus === 'rejected' && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-semibold">申請は却下されました。内容を修正して再申請できます。</p>
                <p className="mt-1">理由: {existingMember.reviewReason || '理由の記載はありません。'}</p>
              </div>
            )}
            {existingMember?.memberStatus === 'withdrawn' && (
              <div className="mb-6 rounded-xl border border-gray-300 bg-gray-100 p-4 text-sm text-gray-800">
                この申請は取下げ済みです。再開する場合は管理者へ連絡してください。
              </div>
            )}

            <DiscordAccountLink onVerified={() => setDiscordVerified(true)} />
            <JoinApplicationForm
              key={formKey}
              member={existingMember ?? null}
              grades={grades}
              isGradesLoading={isGradesLoading}
              discordVerified={discordVerified}
            />
          </>
        )}
      </div>
    </div>
  )
}
