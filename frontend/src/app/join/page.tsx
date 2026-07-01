'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'

export default function JoinPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [joinForm, setJoinForm] = useState({
    name: '',
    grade: '',
    emergencyContact: '',
    studentId: '',
    studentEmail: '',
    insurance: false,
    someAllergy: false,
  })
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useQuery({
    queryKey: ['member'],
    queryFn: async () => {
      const res = await client.api.v0.member.me.$get()
      const status = res.status as number
      if (status === 401) {
        return null
      }
      if (!res.ok) {
        throw new Error(`Member API Error: ${status}`)
      }
      const member = await res.json()
      router.replace('/me')
      return member
    },
    retry: false,
  })

  const { data: grades = [], isLoading: isGradesLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const res = await client.api.v0.grade.$get()
      if (!res.ok) {
        throw new Error(`Grade API Error: ${res.status}`)
      }
      return res.json()
    },
  })

  const handleJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsJoining(true)
    setJoinError(null)

    try {
      const grade = Number(joinForm.grade)
      if (!Number.isInteger(grade)) {
        throw new Error('学年を選択してください。')
      }

      const res = await client.api.v0.member.join.$post({
        json: {
          name: joinForm.name,
          grade,
          emergencyContact: joinForm.emergencyContact,
          studentId: joinForm.studentId,
          studentEmail: joinForm.studentEmail,
          insurance: joinForm.insurance,
          someAllergy: joinForm.someAllergy,
        },
      })
      const status = res.status as number

      if (status === 409) {
        throw new Error('既に入部済みです。マイページに移動してください。')
      }
      if (status === 401) {
        throw new Error('ログイン状態を確認できません。再ログインしてください。')
      }
      if (!res.ok) {
        throw new Error(`入部に失敗しました: ${status}`)
      }

      await queryClient.invalidateQueries({ queryKey: ['member'] })
      router.push('/me')
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '入部に失敗しました。')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">入部登録</h1>
          <p className="text-gray-500 mt-1">部員情報を登録すると、ダッシュボードを利用できます。</p>
        </header>

        <form onSubmit={handleJoin} className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-gray-500 uppercase">氏名</span>
              <input
                value={joinForm.name}
                onChange={event => setJoinForm({ ...joinForm, name: event.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-xs font-medium text-gray-500 uppercase">学年</span>
              <select
                value={joinForm.grade}
                onChange={event => setJoinForm({ ...joinForm, grade: event.target.value })}
                required
                disabled={isGradesLoading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
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
              <span className="block text-xs font-medium text-gray-500 uppercase">学籍番号</span>
              <input
                value={joinForm.studentId}
                onChange={event => setJoinForm({ ...joinForm, studentId: event.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-xs font-medium text-gray-500 uppercase">学生メール</span>
              <input
                type="email"
                value={joinForm.studentEmail}
                onChange={event => setJoinForm({ ...joinForm, studentEmail: event.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="block text-xs font-medium text-gray-500 uppercase">緊急連絡先</span>
              <input
                value={joinForm.emergencyContact}
                onChange={event => setJoinForm({ ...joinForm, emergencyContact: event.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
              <input
                type="checkbox"
                checked={joinForm.insurance}
                onChange={event => setJoinForm({ ...joinForm, insurance: event.target.checked })}
              />
              <span>保険に加入済み</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm">
              <input
                type="checkbox"
                checked={joinForm.someAllergy}
                onChange={event => setJoinForm({ ...joinForm, someAllergy: event.target.checked })}
              />
              <span>申告すべきアレルギーあり</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {joinError ? <p className="text-sm text-red-600 font-medium">{joinError}</p> : <span />}
            <button
              type="submit"
              disabled={isJoining}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isJoining ? '登録中...' : '入部する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
