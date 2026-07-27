'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import AdminMemberHeader from './AdminMemberHeader'
import AdminMemberEditForm from './AdminMemberEditForm'
import MemberStatusBadge from './MemberStatusBadge'
import {
  MemberApiError,
  formatMemberDate,
  memberStatusLabels,
  normalizeRejectionReason,
  readMemberApiError,
  type AdminMemberDetail as AdminMemberDetailData,
} from '../_lib/adminMemberUtils'

const Field = ({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) => (
  <div>
    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{label}</dt>
    <dd className={`mt-1 break-words text-sm text-slate-900 dark:text-zinc-100 ${mono ? 'font-mono text-xs' : ''}`}>{children || '—'}</dd>
  </div>
)

export default function AdminMemberDetail({ memberId }: { memberId: string }) {
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data: member, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-member', memberId],
    queryFn: async () => {
      const response = await client.api.v0.member[':id'].$get({ param: { id: memberId } })
      if (response.status !== 200) {
        throw await readMemberApiError(response, '部員詳細の取得に失敗しました')
      }
      return await response.json() as AdminMemberDetailData
    },
  })

  const refreshAfterDecision = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-member', memberId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-members'] }),
    ])
  }

  const approve = async () => {
    if (!member || !window.confirm(`${member.name}さんの入部申請を承認しますか？`)) return
    setDecision('approve')
    setDecisionError(null)
    setNotice(null)

    try {
      const response = await client.api.v0.member[':id'].approve.$post({
        param: { id: memberId },
        json: { expectedVersion: member.applicationVersion },
      })
      if (response.status !== 200) {
        throw await readMemberApiError(response, '承認に失敗しました')
      }
      setNotice('入部申請を承認しました。')
      await refreshAfterDecision()
    } catch (decisionFailure) {
      const message = decisionFailure instanceof MemberApiError && decisionFailure.status === 409
        ? '申請が別の操作で更新されました。最新状態を読み込みました。内容を確認してから再操作してください。'
        : decisionFailure instanceof Error ? decisionFailure.message : '承認に失敗しました。'
      setDecisionError(message)
      if (decisionFailure instanceof MemberApiError && decisionFailure.status === 409) await refetch()
    } finally {
      setDecision(null)
    }
  }

  const reject = async () => {
    if (!member) return
    const reason = normalizeRejectionReason(rejectReason)
    if (!reason) {
      setDecisionError('却下理由を入力してください。')
      return
    }
    if (!window.confirm(`${member.name}さんの入部申請を却下しますか？`)) return

    setDecision('reject')
    setDecisionError(null)
    setNotice(null)
    try {
      const response = await client.api.v0.member[':id'].reject.$post({
        param: { id: memberId },
        json: { expectedVersion: member.applicationVersion, reason },
      })
      if (response.status !== 200) {
        throw await readMemberApiError(response, '却下に失敗しました')
      }
      setRejectReason('')
      setNotice('入部申請を却下しました。')
      await refreshAfterDecision()
    } catch (decisionFailure) {
      const message = decisionFailure instanceof MemberApiError && decisionFailure.status === 409
        ? '申請が別の操作で更新されました。最新状態を読み込みました。内容を確認してから再操作してください。'
        : decisionFailure instanceof Error ? decisionFailure.message : '却下に失敗しました。'
      setDecisionError(message)
      if (decisionFailure instanceof MemberApiError && decisionFailure.status === 409) await refetch()
    } finally {
      setDecision(null)
    }
  }

  const loadError = error instanceof MemberApiError && error.status === 403
    ? '管理者権限がないため、この情報は閲覧できません。'
    : error instanceof MemberApiError && error.status === 404
      ? '指定された部員・申請は見つかりません。'
      : error instanceof Error ? error.message : null

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 p-10 text-center text-slate-500 dark:bg-zinc-950 dark:text-zinc-400">部員詳細を読み込んでいます…</div>
  }

  if (!member || loadError) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-zinc-950 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-semibold">{loadError || '部員詳細を表示できません。'}</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">再試行</button>
            <Link href="/admin/members" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold dark:border-red-900">台帳へ戻る</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 md:px-8">
      <main className="mx-auto max-w-6xl space-y-6">
        <AdminMemberHeader
          eyebrow="Private member record"
          title={member.name}
          description="申請内容、本人確認情報、審査履歴を確認します。表示内容は機密情報です。"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-3">
            <MemberStatusBadge status={member.memberStatus} />
            <span className="text-sm text-slate-500 dark:text-zinc-400">申請バージョン {member.applicationVersion}</span>
          </div>
          <Link href={member.memberStatus === 'pending' ? '/admin/applications' : '/admin/members'} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
            一覧へ戻る
          </Link>
        </div>

        {(notice || decisionError) && (
          <div role="status" className={`rounded-xl border p-4 text-sm font-semibold ${decisionError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'}`}>
            {decisionError || notice}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="font-bold text-slate-950 dark:text-white">登録情報</h2>
          </div>
          <dl className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="登録氏名">{member.name}</Field>
            <Field label="学年">{member.displayGrade}</Field>
            <Field label="学籍番号" mono>{member.studentId}</Field>
            <Field label="学生メール">{member.studentEmail}</Field>
            <Field label="認証メール">{member.userEmail}</Field>
            <Field label="緊急連絡先">{member.emergencyContact}</Field>
            <Field label="保険">{member.insurance ? '加入済み' : '未加入'}</Field>
            <Field label="アレルギー">{member.someAllergy ? '申告あり' : '申告なし'}</Field>
            <Field label="アレルギー詳細">{member.allergyDetails || '—'}</Field>
            <Field label="申請日時">{formatMemberDate(member.submittedAt)}</Field>
            <Field label="審査日時">{formatMemberDate(member.reviewedAt)}</Field>
            <Field label="User ID" mono>{member.userId}</Field>
            <Field label="Member ID" mono>{member.memberId}</Field>
            <Field label="更新日時">{formatMemberDate(member.updatedAt)}</Field>
            <Field label="審査理由">{member.reviewReason || '—'}</Field>
          </dl>
        </section>

        <AdminMemberEditForm
          key={`${member.memberId}:${member.applicationVersion}`}
          member={member}
          onFeedback={(feedback) => {
            setNotice(feedback?.type === 'success' ? feedback.message : null)
            setDecisionError(feedback?.type === 'error' ? feedback.message : null)
          }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-bold text-slate-950 dark:text-white">Discord本人確認</h2>
            {member.discord ? (
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Username">{member.discord.username}</Field>
                <Field label="表示名">{member.discord.providerDisplayName || '—'}</Field>
                <Field label="サーバーニックネーム">{member.discord.nickname || '—'}</Field>
                <Field label="Community ID" mono>{member.discord.communityId}</Field>
                <Field label="Roles">{member.discord.roles.join(', ') || '—'}</Field>
                <Field label="確認日時">{formatMemberDate(member.discord.verifiedAt)}</Field>
                <Field label="最終照合">{formatMemberDate(member.discord.lastCheckedAt)}</Field>
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Discordの検証済み情報がありません。</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-bold text-slate-950 dark:text-white">公開プロフィール</h2>
            {member.directoryProfile ? (
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="表示名">{member.directoryProfile.displayName}</Field>
                <Field label="公開状態">{member.directoryProfile.directoryVisible ? '公開' : '非公開'}</Field>
                <Field label="Skills">{member.directoryProfile.skills.join(', ') || '—'}</Field>
                <Field label="Interests">{member.directoryProfile.interests.join(', ') || '—'}</Field>
                <div className="sm:col-span-2"><Field label="現在の活動">{member.directoryProfile.currentActivities || '—'}</Field></div>
                <div className="sm:col-span-2"><Field label="Bio">{member.directoryProfile.bio || '—'}</Field></div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">公開プロフィールはまだありません。</p>
            )}
          </section>
        </div>

        {member.memberStatus === 'pending' && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <h2 className="font-bold text-amber-950 dark:text-amber-200">申請を審査</h2>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">承認前に登録情報とDiscord本人確認を照合してください。却下には理由が必須です。</p>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">却下理由</span>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="本人が修正・再申請できる具体的な理由を入力"
                  className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-amber-900/60 dark:bg-zinc-950 dark:focus:ring-amber-950"
                />
                <span className="mt-1 block text-right text-xs text-amber-700 dark:text-amber-400">{rejectReason.length}/2000</span>
              </label>
              <div className="flex flex-wrap gap-3 lg:flex-col">
                <button type="button" onClick={approve} disabled={decision !== null} className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300">
                  {decision === 'approve' ? '承認中…' : '承認する'}
                </button>
                <button type="button" onClick={reject} disabled={decision !== null || !normalizeRejectionReason(rejectReason)} className="rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300">
                  {decision === 'reject' ? '却下中…' : '理由を付けて却下'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-bold text-slate-950 dark:text-white">状態変更履歴</h2>
          {member.statusHistory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">履歴はありません。</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {member.statusHistory.map((history, index) => (
                <li key={`${history.createdAt}:${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 dark:text-zinc-100">
                      {history.fromStatus ? memberStatusLabels[history.fromStatus] : '新規'} → {memberStatusLabels[history.toStatus]}
                    </p>
                    <time className="text-xs text-slate-500 dark:text-zinc-400">{formatMemberDate(history.createdAt)}</time>
                  </div>
                  {history.reason && <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-zinc-300">{history.reason}</p>}
                  {history.changedByUserId && <p className="mt-2 font-mono text-[10px] text-slate-400">Actor: {history.changedByUserId}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  )
}
