'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import {
  buildAdminMemberUpdatePayload,
  createAdminMemberEditValues,
  splitProfileTags,
  type AdminMemberEditValues,
} from '../_lib/adminMemberEditUtils'
import {
  MemberApiError,
  readMemberApiError,
  type AdminMemberDetail,
} from '../_lib/adminMemberUtils'

type GradeOption = {
  id: number
  code: string
  displayGrade: string
  sortOrder: number
  isActive: boolean
}

type Feedback = { type: 'success' | 'error'; message: string } | null

type AdminMemberEditFormProps = {
  member: AdminMemberDetail
  onFeedback: (feedback: Feedback) => void
}

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:ring-blue-950 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500'

const Label = ({ title, required = false, children }: { title: string; required?: boolean; children: ReactNode }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
      {title}{required && <span className="ml-1 text-red-600">必須</span>}
    </span>
    {children}
  </label>
)

const validate = (member: AdminMemberDetail, values: AdminMemberEditValues) => {
  if (!values.name.trim()) return '登録氏名を入力してください。'
  if (!Number.isInteger(values.grade) || values.grade <= 0) return '学年を選択してください。'
  if (!values.studentId.trim()) return '学籍番号を入力してください。'
  if (!values.studentEmail.trim()) return '学生メールを入力してください。'
  if (!values.emergencyContact.trim()) return '緊急連絡先を入力してください。'
  if (values.allergyDetails.length > 2000) return 'アレルギー詳細は2000文字以内で入力してください。'

  if (member.memberStatus === 'active' && values.withdrawMember) {
    if (!values.reason.trim()) return '退部理由を入力してください。'
    if (values.reason.length > 2000) return '退部理由は2000文字以内で入力してください。'
    return null
  }

  if (member.memberStatus === 'active') {
    if (!values.displayName.trim()) return '一般部員向け台帳の表示名を入力してください。'
    const tags = [...splitProfileTags(values.skills), ...splitProfileTags(values.interests)]
    if (splitProfileTags(values.skills).length > 30 || splitProfileTags(values.interests).length > 30) {
      return 'スキルと興味はそれぞれ30件以内で入力してください。'
    }
    if (tags.some((tag) => tag.length > 100)) return 'スキルと興味の各項目は100文字以内で入力してください。'
    if (values.currentActivities.length > 2000 || values.bio.length > 2000) {
      return '現在の活動と自己紹介はそれぞれ2000文字以内で入力してください。'
    }
  }

  return null
}

export default function AdminMemberEditForm({ member, onFeedback }: AdminMemberEditFormProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(() => createAdminMemberEditValues(member))
  const [saving, setSaving] = useState(false)

  const { data: grades = [], isLoading: gradesLoading, error: gradesError } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const response = await client.api.v0.grade.$get()
      if (response.status !== 200) throw new Error(`学年一覧の取得に失敗しました: ${response.status}`)
      return await response.json() as GradeOption[]
    },
  })

  const gradeOptions = grades
    .filter((grade) => grade.isActive || grade.id === member.grade)
    .sort((left, right) => left.sortOrder - right.sortOrder)

  const updateValue = <Key extends keyof AdminMemberEditValues>(key: Key, value: AdminMemberEditValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validate(member, values)
    if (validationError) {
      onFeedback({ type: 'error', message: validationError })
      return
    }
    if (values.withdrawMember && !window.confirm(`${member.name}さんを退部扱いに変更しますか？`)) return

    setSaving(true)
    onFeedback(null)
    try {
      const response = await client.api.v0.member[':id'].$put({
        param: { id: member.memberId },
        json: buildAdminMemberUpdatePayload(member, values),
      })
      if (response.status !== 200) throw await readMemberApiError(response, '部員情報の更新に失敗しました')

      onFeedback({
        type: 'success',
        message: values.withdrawMember ? '部員情報を更新し、退部状態に変更しました。' : '部員情報を更新しました。',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-member', member.memberId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-members'] }),
        queryClient.invalidateQueries({ queryKey: ['member-directory'] }),
      ])
    } catch (failure) {
      const conflict = failure instanceof MemberApiError && failure.status === 409
      onFeedback({
        type: 'error',
        message: conflict
          ? '別の操作で部員情報が更新されました。最新状態を再読込しました。内容を確認して再度保存してください。'
          : failure instanceof Error ? failure.message : '部員情報の更新に失敗しました。',
      })
      if (conflict) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin-member', member.memberId] }),
          queryClient.invalidateQueries({ queryKey: ['admin-members'] }),
        ])
      }
    } finally {
      setSaving(false)
    }
  }

  const profileEditable = member.memberStatus === 'active' && !values.withdrawMember

  return (
    <section className="rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900/50 dark:bg-zinc-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-bold text-slate-950 dark:text-white">管理者による登録情報の編集</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          登録氏名・学籍番号・学生メールは承認後も管理者のみ修正できます。権限ロールはこの画面から変更できません。
        </p>
      </div>

      <form onSubmit={save} className="space-y-8 p-5">
        <fieldset disabled={saving} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <legend className="sr-only">本人・連絡情報</legend>
          <Label title="登録氏名" required>
            <input className={inputClass} value={values.name} onChange={(event) => updateValue('name', event.target.value)} maxLength={200} required />
          </Label>
          <Label title="学年" required>
            <select className={inputClass} value={values.grade} onChange={(event) => updateValue('grade', Number(event.target.value))} disabled={saving || gradesLoading} required>
              {gradeOptions.length === 0 && <option value={member.grade}>{member.displayGrade}</option>}
              {gradeOptions.map((grade) => <option key={grade.id} value={grade.id}>{grade.displayGrade}</option>)}
            </select>
            {gradesError && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">学年一覧を取得できないため、現在値のみ表示しています。</span>}
          </Label>
          <Label title="学籍番号" required>
            <input className={inputClass} value={values.studentId} onChange={(event) => updateValue('studentId', event.target.value)} maxLength={64} autoComplete="off" required />
          </Label>
          <Label title="学生メール" required>
            <input className={inputClass} type="email" value={values.studentEmail} onChange={(event) => updateValue('studentEmail', event.target.value)} maxLength={320} autoComplete="off" required />
          </Label>
          <div className="md:col-span-2">
            <Label title="緊急連絡先" required>
              <input className={inputClass} value={values.emergencyContact} onChange={(event) => updateValue('emergencyContact', event.target.value)} maxLength={500} autoComplete="off" required />
            </Label>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-zinc-700">
            <input type="checkbox" checked={values.insurance} onChange={(event) => updateValue('insurance', event.target.checked)} className="size-4" />
            保険加入済み
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-zinc-700">
            <input type="checkbox" checked={values.someAllergy} onChange={(event) => updateValue('someAllergy', event.target.checked)} className="size-4" />
            アレルギー申告あり
          </label>
          <div className="md:col-span-2">
            <Label title="アレルギー詳細">
              <textarea className={inputClass} value={values.allergyDetails} onChange={(event) => updateValue('allergyDetails', event.target.value)} disabled={saving || !values.someAllergy} maxLength={2000} rows={3} />
            </Label>
          </div>
        </fieldset>

        <fieldset disabled={saving || !profileEditable} className="grid grid-cols-1 gap-5 border-t border-slate-200 pt-7 dark:border-zinc-800 md:grid-cols-2">
          <legend className="mb-2 font-bold text-slate-950 dark:text-white">一般部員向け台帳プロフィール</legend>
          <p className="md:col-span-2 text-sm text-slate-500 dark:text-zinc-400">
            {member.memberStatus === 'active'
              ? values.withdrawMember ? '退部処理とプロフィール編集は同時に実行できません。' : '「台帳に掲載」を有効にした在籍部員だけが一般部員向け台帳に表示されます。'
              : 'プロフィール項目は在籍中の部員だけ編集できます。'}
          </p>
          <Label title="表示名" required={profileEditable}>
            <input className={inputClass} value={values.displayName} onChange={(event) => updateValue('displayName', event.target.value)} maxLength={100} required={profileEditable} />
          </Label>
          <label className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-zinc-700">
            <input type="checkbox" checked={values.directoryVisible} onChange={(event) => updateValue('directoryVisible', event.target.checked)} className="size-4" />
            一般部員向け台帳に掲載
          </label>
          <Label title="スキル（改行またはカンマ区切り）">
            <textarea className={inputClass} value={values.skills} onChange={(event) => updateValue('skills', event.target.value)} rows={4} />
          </Label>
          <Label title="興味（改行またはカンマ区切り）">
            <textarea className={inputClass} value={values.interests} onChange={(event) => updateValue('interests', event.target.value)} rows={4} />
          </Label>
          <Label title="現在の活動">
            <textarea className={inputClass} value={values.currentActivities} onChange={(event) => updateValue('currentActivities', event.target.value)} maxLength={2000} rows={4} />
          </Label>
          <Label title="自己紹介">
            <textarea className={inputClass} value={values.bio} onChange={(event) => updateValue('bio', event.target.value)} maxLength={2000} rows={4} />
          </Label>
        </fieldset>

        {member.memberStatus === 'active' && (
          <fieldset disabled={saving} className="space-y-4 border-t border-red-200 pt-7 dark:border-red-900/50">
            <legend className="font-bold text-red-800 dark:text-red-300">退部処理</legend>
            <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
              <input type="checkbox" checked={values.withdrawMember} onChange={(event) => updateValue('withdrawMember', event.target.checked)} className="mt-0.5 size-4" />
              <span><strong className="block">この保存で退部状態に変更する</strong>この操作は通常の編集と異なり、在籍状態を終了します。</span>
            </label>
            {values.withdrawMember && (
              <Label title="退部理由" required>
                <textarea className={inputClass} value={values.reason} onChange={(event) => updateValue('reason', event.target.value)} maxLength={2000} rows={4} required />
              </Label>
            )}
          </fieldset>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-zinc-800">
          <p className="text-xs text-slate-500 dark:text-zinc-400">保存時のバージョン: {member.applicationVersion}。競合時は上書きせず、最新情報を再読込します。</p>
          <button type="submit" disabled={saving || gradesLoading} className={`rounded-lg px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${values.withdrawMember ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {saving ? '保存中…' : values.withdrawMember ? '編集内容を保存して退部にする' : '編集内容を保存'}
          </button>
        </div>
      </form>
    </section>
  )
}
