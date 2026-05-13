import { hc } from 'hono/client'
import type { App as MemberApp } from '@backend/index'
import type { App as CommunityApp } from '@community/index'
import { createClient } from './supabase'

const getHeaders = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}

export const getMemberClient = (baseUrl?: string) => {
  return hc<MemberApp>(baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788', {
    headers: getHeaders
  })
}

export const getCommunityClient = (baseUrl?: string) => {
  return hc<CommunityApp>(baseUrl || process.env.NEXT_PUBLIC_COMMUNITY_API_URL || 'http://localhost:8787', {
    headers: getHeaders
  })
}

export const client = getMemberClient()
export const communityClient = getCommunityClient()
