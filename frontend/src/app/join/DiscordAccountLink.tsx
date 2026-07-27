'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth'
import { communityClient } from '@/lib/client'

type DiscordAccountLinkProps = {
  onVerified: () => void
}

export default function DiscordAccountLink({ onVerified }: DiscordAccountLinkProps) {
  const [isLinking, setIsLinking] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accountsQuery = useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const result = await authClient.listAccounts()
      if (result.error) throw new Error(result.error.message || '連携アカウントを取得できませんでした。')
      return result.data ?? []
    },
    retry: false,
  })

  const discordAccount = accountsQuery.data?.find(account => account.providerId === 'discord')

  const linkDiscord = async () => {
    setIsLinking(true)
    setError(null)
    try {
      const result = await authClient.linkSocial({
        provider: 'discord',
        callbackURL: `${window.location.origin}/join?discord=linked`,
        errorCallbackURL: `${window.location.origin}/join?discord=error`,
      })
      if (result.error) throw new Error(result.error.message || 'Discord連携を開始できませんでした。')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Discord連携を開始できませんでした。')
      setIsLinking(false)
    }
  }

  const verifyDiscord = async () => {
    setIsVerifying(true)
    setError(null)
    try {
      const response = await communityClient.api.v0.user.me.identities.discord.verify.$post()
      if (!response.ok) {
        const body = await response.json()
        throw new Error('message' in body ? body.message : `Discord確認に失敗しました: ${response.status}`)
      }
      await response.json()
      setVerified(true)
      onVerified()
    } catch (cause) {
      setVerified(false)
      setError(cause instanceof Error ? cause.message : 'Discord確認に失敗しました。')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950 dark:text-white">Discord本人確認</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-zinc-300">
            Discord OAuthで確認したアカウントと、対象サーバーへの参加が入部申請の必須条件です。
            Discord IDをフォームへ手入力することはできません。
          </p>
        </div>

        {accountsQuery.isLoading ? (
          <span className="text-sm text-slate-500">確認中...</span>
        ) : discordAccount ? (
          <button
            type="button"
            onClick={verifyDiscord}
            disabled={isVerifying}
            className="rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:bg-emerald-600"
          >
            {isVerifying ? '確認中...' : verified ? '確認済み（再確認）' : 'サーバー参加を確認'}
          </button>
        ) : (
          <button
            type="button"
            onClick={linkDiscord}
            disabled={isLinking}
            className="rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60"
          >
            {isLinking ? 'Discordへ移動中...' : 'Discordを連携'}
          </button>
        )}
      </div>

      {(error || accountsQuery.error) && (
        <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error || (accountsQuery.error instanceof Error ? accountsQuery.error.message : 'Discord連携状態を取得できませんでした。')}
        </p>
      )}
    </section>
  )
}
