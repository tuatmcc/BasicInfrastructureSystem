'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import ProfileEditForm from './ProfileEditForm'

export default function MePage() {
  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member'],
    queryFn: async () => {
      const res = await client.api.v0.member.me.$get()
      const status = res.status as number
      if (status === 404) {
        return null
      }
      if (status === 401) throw new Error('ログイン状態を確認できません。再ログインしてください。')
      if (!res.ok) {
        throw new Error(`API Error: ${status}`)
      }
      return res.json()
    },
  })

  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const response = await client.api.v0.grade.$get()
      if (!response.ok) throw new Error(`Grade API Error: ${response.status}`)
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse text-xl text-gray-600">Loading profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Error</h1>
          <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-xl mx-auto bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">入部登録が必要です</h1>
          <p className="text-gray-500 mt-2">プロフィールを表示するには、先に部員情報を登録してください。</p>
          <Link href="/join" className="inline-flex mt-6 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            入部登録へ進む
          </Link>
        </div>
      </div>
    )
  }

  if (member.memberStatus !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-xl mx-auto bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">入部申請を確認してください</h1>
          <p className="text-gray-500 mt-2">承認済みになるまで、申請画面で状態確認と内容修正を行います。</p>
          <Link href="/join" className="inline-flex mt-6 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            入部申請へ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">自分のプロフィール</h1>
            <p className="text-gray-500">登録情報と一般台帳向けプロフィールを管理します。</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/members" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">部員台帳</Link>
            <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium">承認済み</div>
          </div>
        </header>

        <div>
          <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Member Profile</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                <p className="text-lg font-semibold text-gray-900">{member.name}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Student ID</label>
                <p className="text-lg font-semibold text-gray-900">{member.studentId}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <p className="text-gray-900">{member.studentEmail}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Grade</label>
                <p className="text-gray-900">{member.displayGrade}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">Emergency Contact</span>
                <span className="font-medium text-gray-900">{member.emergencyContact}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">Insurance Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${member.insurance ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {member.insurance ? 'COVERED' : 'NOT COVERED'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Allergies</span>
                <span className={`font-medium ${member.someAllergy ? 'text-red-600' : 'text-gray-900'}`}>
                  {member.someAllergy ? 'Documented' : 'None Reported'}
                </span>
              </div>
            </div>
          </section>

        </div>
        <ProfileEditForm member={member} grades={grades} />
      </div>
    </div>
  )
}
