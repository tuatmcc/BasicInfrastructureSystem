import { hc } from 'hono/client'
import type { App as MemberApp } from '@backend/index'
import type { App as CommunityApp } from '@community/index'


const getHeaders = async () => {
  const headers: Record<string, string> = {}
  
  // クッキーから 'app-authorization' (独自JWT) を取得する
  // 注: HttpOnly クッキーを JS から直接取得することはできません。
  // そのため、ここではブラウザのクッキー送信機能に任せるか、
  // あるいはサーバーサイドでのリクエストの場合はクッキーをヘッダーに移し替える必要があります。
  
  // しかし、Hono Client (hc) をブラウザで使用している場合、
  // fetch のデフォルト挙動（credentials: 'include'）により、
  // Cookie は自動的に送信されます。
  
  return headers
}

export const getMemberClient = (baseUrl?: string) => {
  return hc<MemberApp>(baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788', {
    headers: getHeaders,
    fetch: (url: string | URL | Request, options?: RequestInit) => fetch(url, { ...options, credentials: 'include' }) // Cookieを送信するために追加
  })
}

export const getCommunityClient = (baseUrl?: string) => {
  return hc<CommunityApp>(baseUrl || process.env.NEXT_PUBLIC_COMMUNITY_API_URL || 'http://localhost:8787', {
    headers: getHeaders,
    fetch: (url: string | URL | Request, options?: RequestInit) => fetch(url, { ...options, credentials: 'include' }) // Cookieを送信するために追加
  })
}

export const client = getMemberClient()
export const communityClient = getCommunityClient()
