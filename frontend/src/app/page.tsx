'use client'

import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'

export default function DashboardPage() {
  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member'],
    queryFn: async () => {
      const res = await client.menber.$get()
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`)
      }
      return res.json()
    },
  })

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
                  <p className="text-gray-900">{member?.grade}</p>
                </div>
              </div>
            </section>

            <section className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Additional Details</h2>
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
          </div>
        </div>
      </div>
    </div>
  )
}
