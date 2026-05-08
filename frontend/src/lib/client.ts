import { hc } from 'hono/client'
import type { App } from '@backend/index'
import { createClient } from './supabase'

export const getClient = (baseUrl?: string) => {
  const supabase = createClient()
  
  return hc<App>(baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787', {
    headers: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      return headers
    }
  })
}

export const client = getClient()
