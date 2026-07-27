'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { buildActiveProfileUpdatePayload, type ActiveProfileFormValues } from './profileFormUtils'

type MemberForEdit = {
  applicationVersion: number
  grade: number
  emergencyContact: string
  insurance: boolean
  someAllergy: boolean
  allergyDetails: string | null
  directoryProfile: {
    displayName: string
    skills: string[]
    interests: string[]
    currentActivities: string
    bio: string
  } | null
}

type Grade = { id: number; displayGrade: string }

export default function ProfileEditForm({ member, grades }: { member: MemberForEdit; grades: Grade[] }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<ActiveProfileFormValues>({
    grade: String(member.grade),
    emergencyContact: member.emergencyContact,
    insurance: member.insurance,
    someAllergy: member.someAllergy,
    allergyDetails: member.allergyDetails ?? '',
    displayName: member.directoryProfile?.displayName ?? '',
    skills: member.directoryProfile?.skills.join(', ') ?? '',
    interests: member.directoryProfile?.interests.join(', ') ?? '',
    currentActivities: member.directoryProfile?.currentActivities ?? '',
    bio: member.directoryProfile?.bio ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof ActiveProfileFormValues>(key: K, value: ActiveProfileFormValues[K]) => {
    setValues(current => ({ ...current, [key]: value }))
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)
    setError(null)
    try {
      const payload = buildActiveProfileUpdatePayload(member.applicationVersion, values)
      if (!Number.isInteger(payload.grade)) throw new Error('学年を選択してください。')
      const response = await client.api.v0.member.me.$put({ json: payload })
      if (response.status === 409) throw new Error('別の更新が先に保存されました。ページを再読み込みしてください。')
      if (!response.ok) throw new Error(`プロフィール更新に失敗しました: ${response.status}`)
      const updated = await response.json()
      queryClient.setQueryData(['member'], updated)
      setMessage('プロフィールを更新しました。')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'プロフィール更新に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">プロフィールを更新</h2>
        <p className="mt-1 text-sm text-gray-500">氏名・学籍番号・学生メールは承認後は管理者のみ変更できます。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">学年</span>
          <select value={values.grade} onChange={event => update('grade', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            {grades.map(grade => <option key={grade.id} value={grade.id}>{grade.displayGrade}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">緊急連絡先</span>
          <input required value={values.emergencyContact} onChange={event => update('emergencyContact', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">公開表示名</span>
          <input required value={values.displayName} onChange={event => update('displayName', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">スキル（カンマ区切り）</span>
          <input value={values.skills} onChange={event => update('skills', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">興味（カンマ区切り）</span>
          <input value={values.interests} onChange={event => update('interests', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
          <input type="checkbox" checked={values.insurance} onChange={event => update('insurance', event.target.checked)} />
          保険に加入済み
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
          <input type="checkbox" checked={values.someAllergy} onChange={event => update('someAllergy', event.target.checked)} />
          申告すべきアレルギーあり
        </label>
        {values.someAllergy && (
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-gray-500">アレルギー詳細</span>
            <textarea value={values.allergyDetails} onChange={event => update('allergyDetails', event.target.value)} className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
        )}
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-gray-500">現在取り組んでいること</span>
          <textarea value={values.currentActivities} onChange={event => update('currentActivities', event.target.value)} className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-gray-500">自己紹介</span>
          <textarea value={values.bio} onChange={event => update('bio', event.target.value)} className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-red-700">{error}</span>}
        </div>
        <button disabled={isSaving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {isSaving ? '保存中...' : '変更を保存'}
        </button>
      </div>
    </form>
  )
}
