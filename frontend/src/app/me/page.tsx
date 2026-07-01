'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'

export default function MePage() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member'],
    queryFn: async () => {
      const res = await client.api.v0.member.me.$get()
      const status = res.status as number
      if (status === 401) {
        return null
      }
      if (!res.ok) {
        throw new Error(`API Error: ${status}`)
      }
      return res.json()
    },
  })

  const handleExportCSV = async () => {
    if (!member?.memberId) return
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)
    try {
      const headers = ['名前', '学年', '学籍番号', '学生メールアドレス', '緊急連絡先', '保険加入状況', 'アレルギー情報', '作成日時', 'メンバーID']
      const csvRows = [headers.map(h => `"${h}"`).join(',')]
      const row = [
        member.name || '',
        member.displayGrade || member.grade || '',
        member.studentId || '',
        member.studentEmail || '',
        member.emergencyContact || '',
        member.insurance ? '加入' : '未加入',
        member.someAllergy ? 'あり' : 'なし',
        member.createdAt || '',
        member.memberId || '',
      ]
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))

      const csvContent = '\ufeff' + csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `member_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'CSVの出力に失敗しました。')
    } finally {
      setIsExporting(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500">登録済みの部員情報です。</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium">Active Member</div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="md:col-span-2 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
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

          <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 h-fit">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Export</h3>
            <p className="text-xs text-gray-500 mb-4">自分の部員情報をCSVで出力します。</p>
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 font-medium text-sm"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            {exportError && <p className="text-xs text-red-600 mt-2 font-medium">{exportError}</p>}
            {exportSuccess && <p className="text-xs text-green-600 mt-2 font-medium">CSV downloaded successfully!</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
