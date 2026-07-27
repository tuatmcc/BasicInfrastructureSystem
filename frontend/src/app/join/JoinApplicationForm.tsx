'use client'

import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import {
  buildJoinSubmission,
  createJoinFormValues,
  type ExistingJoinApplication,
  type JoinFormValues,
} from './joinFormUtils'

type Grade = { id: number; displayGrade: string }

type JoinApplicationFormProps = {
  member: ExistingJoinApplication | null
  grades: Grade[]
  isGradesLoading: boolean
  discordVerified: boolean
}

export default function JoinApplicationForm({
  member,
  grades,
  isGradesLoading,
  discordVerified,
}: JoinApplicationFormProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<JoinFormValues>(() => createJoinFormValues(member))
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const update = <Key extends keyof JoinFormValues>(key: Key, value: JoinFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsJoining(true)
    setJoinError(null)

    try {
      if (!discordVerified) {
        throw new Error('Discord本人確認と対象サーバーへの参加確認を完了してください。')
      }
      const submission = buildJoinSubmission(member, values)

      // Prevent an older /me response from overwriting the successful join result.
      await queryClient.cancelQueries({ queryKey: ['member'] })

      const response = submission.kind === 'update-pending'
        ? await client.api.v0.member.me.$put({ json: submission.payload })
        : await client.api.v0.member.join.$post({ json: submission.payload })
      const status = response.status as number

      if (status === 409) throw new Error('申請状態が更新されています。ページを再読み込みしてください。')
      if (status === 401) throw new Error('ログイン状態を確認できません。再ログインしてください。')
      if (!response.ok) throw new Error(`入部申請の保存に失敗しました: ${status}`)

      const savedMember = await response.json()
      queryClient.setQueryData(['member'], savedMember)
    } catch (cause) {
      setJoinError(cause instanceof Error ? cause.message : '入部申請の保存に失敗しました。')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <form onSubmit={handleJoin} className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase text-gray-500">氏名</span>
          <input
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase text-gray-500">学年</span>
          <select
            value={values.grade}
            onChange={(event) => update('grade', event.target.value)}
            required
            disabled={isGradesLoading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">選択してください</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.displayGrade}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase text-gray-500">学籍番号</span>
          <input
            value={values.studentId}
            onChange={(event) => update('studentId', event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase text-gray-500">学生メール</span>
          <input
            type="email"
            value={values.studentEmail}
            onChange={(event) => update('studentEmail', event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="block text-xs font-medium uppercase text-gray-500">緊急連絡先</span>
          <input
            value={values.emergencyContact}
            onChange={(event) => update('emergencyContact', event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
          <input type="checkbox" checked={values.insurance} onChange={(event) => update('insurance', event.target.checked)} />
          <span>保険に加入済み</span>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
          <input type="checkbox" checked={values.someAllergy} onChange={(event) => update('someAllergy', event.target.checked)} />
          <span>申告すべきアレルギーあり</span>
        </label>
      </div>

      {values.someAllergy && (
        <label className="block space-y-1">
          <span className="block text-xs font-medium uppercase text-gray-500">アレルギー詳細</span>
          <textarea
            value={values.allergyDetails}
            onChange={(event) => update('allergyDetails', event.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {joinError ? <p className="text-sm font-medium text-red-600">{joinError}</p> : <span />}
        <button
          type="submit"
          disabled={isJoining || !discordVerified || member?.memberStatus === 'withdrawn'}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isJoining
            ? '保存中...'
            : !discordVerified
              ? 'Discord確認が必要です'
              : member?.memberStatus === 'pending'
                ? '申請内容を更新'
                : member?.memberStatus === 'rejected'
                  ? '修正して再申請'
                  : '入部申請を提出'}
        </button>
      </div>
    </form>
  )
}
