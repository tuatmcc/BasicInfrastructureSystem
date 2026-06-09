'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { client, communityClient } from '@/lib/client'

export default function DashboardPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleExportCSV = async () => {
    if (!member?.memberId) return;
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)
    try {
      const res = await client.api.v0.member["by-ids"].$post({
        json: {
          ids: [member.memberId]
        }
      })
      if (res.status === 403) {
        throw new Error("管理者権限がありません (Forbidden)")
      }
      if (res.status === 401) {
        throw new Error("認証されていません (Unauthorized)")
      }
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`)
      }
      
      const membersData = await res.json()
      if (!Array.isArray(membersData) || membersData.length === 0) {
        throw new Error("メンバー情報が見つかりません。")
      }
      
      const headers = ["名前", "学年", "学籍番号", "学生メールアドレス", "緊急連絡先", "保険加入状況", "アレルギー情報", "作成日時", "メンバーID"]
      const csvRows = [headers.map(h => `"${h}"`).join(",")]
      
      for (const m of membersData) {
        const row = [
          m.name || "",
          m.displayGrade || m.grade || "",
          m.studentId || "",
          m.studentEmail || "",
          m.emergencyContact || "",
          m.insurance ? "加入" : "未加入",
          m.someAllergy ? "あり" : "なし",
          m.createdAt || "",
          m.memberId || ""
        ]
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      }
      
      const csvContent = "\ufeff" + csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `member_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setExportSuccess(true)
    } catch (err) {
      console.error(err)
      setExportError(err instanceof Error ? err.message : "CSVの出力に失敗しました。")
    } finally {
      setIsExporting(false)
    }
  }

  const { data: member, isLoading: isMemberLoading, error } = useQuery({
    queryKey: ['member'],
    queryFn: async () => {
      const res = await client.api.v0.member.me.$get()
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`)
      }
      return res.json()
    },
  })

  // // communityClient を使用してロール一覧を取得
  // const { data: roles, isLoading: isRolesLoading } = useQuery({
  //   queryKey: ['roles'],
  //   queryFn: async () => {
  //     // バックエンドのルーター定義を整理したことで、anyなしで型が通るようになります
  //     const res = await communityClient.api.v0.user.me.role.$get()
  //     if (!res.ok) {
  //       throw new Error(`Roles API Error: ${res.status}`)
  //     }
  //     return res.json()
  //   },
  // })

  const isLoading = isMemberLoading // || isRolesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse text-xl text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Error</h1>
          <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome back to the Basic Infrastructure System</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium">
            Active Member
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Member Profile</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900">{member?.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Student ID</label>
                  <p className="text-lg font-semibold text-gray-900">{member?.studentId}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                  <p className="text-gray-900">{member?.studentEmail}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Grade</label>
                  <p className="text-gray-900">{member?.displayGrade}</p>
                </div>
              </div>
           
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600">Emergency Contact</span>
                  <span className="font-medium text-gray-900">{member?.emergencyContact}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-600">Insurance Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${member?.insurance ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {member?.insurance ? 'COVERED' : 'NOT COVERED'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Allergies</span>
                  <span className={`font-medium ${member?.someAllergy ? 'text-red-600' : 'text-gray-900'}`}>
                    {member?.someAllergy ? 'Documented' : 'None Reported'}
                  </span>
                </div>
              </div>
            </section>

            {/* Roles Section
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Community Roles</h2>
              </div>
              <div className="p-6">
                {roles && roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <span 
                        key={role.roleId} 
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-sm font-medium"
                      >
                        {role.roleName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No roles assigned</p>
                )}
              </div>
            </section> */}
          </div>

          <div className="space-y-6">
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-blue-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> Update Profile
                  </a>
                </li>
                <li>
                  <a href="/logout" className="text-red-600 hover:underline flex items-center">
                    <span className="mr-2">→</span> Logout
                  </a>
                </li>
              </ul>
            </section>

            <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Tools</h3>
              <p className="text-xs text-gray-500 mb-4">Export member database details to a CSV spreadsheet.</p>
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors font-medium text-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">📥</span>
                    <span>Export Members (CSV)</span>
                  </>
                )}
              </button>
              {exportError && (
                <p className="text-xs text-red-600 mt-2 font-medium">{exportError}</p>
              )}
              {exportSuccess && (
                <p className="text-xs text-green-600 mt-2 font-medium">CSV downloaded successfully!</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
