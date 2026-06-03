'use client'

import { useEffect } from 'react'
import { authClient } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const performLogout = async () => {
      try {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              // Middleware will handle the redirect to /login 
              // because the session cookie will be gone.
              // But we can force it here too.
              router.push('/login')
            }
          }
        })
      } catch (error) {
        console.error('Logout failed:', error)
        // Even if API fails, we often want to clear local state
        router.push('/login')
      }
    }

    performLogout()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Signing out...</h2>
        <p className="text-gray-500 mt-2">Please wait while we secure your session.</p>
      </div>
    </div>
  )
}
