import { createMiddleware } from 'hono/factory'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'
type Env = {
  Bindings: Bindings
  Variables: Variables
}

export const supabaseMiddleware = createMiddleware<Env>(async (c, next) => {
  const authorization = c.req.header('authorization') ?? c.req.header('Authorization')

  let token: string | null = null
  if (authorization) {
    const parts = authorization.trim().split(/\s+/)
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1]
    }
  }

  // ① Bearerトークンが無ければ、即座に弾く（401 エラー）
  if (!token) {
    return c.json({ error: 'Unauthorized: Bearer token is required' }, 401)
  }

  // ② トークンをヘッダーにセットして、Supabaseクライアントを作成
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,      // ★ セッションをlocalStorageに保存しない（サーバーに不要）
        autoRefreshToken: false,    // ★ トークンの自動リフレッシュをしない（サーバーに不要）
      }
    }
  )
  // ③ 【重要】Supabase APIを叩いて、トークンが本物か・期限切れでないかを確認する
  // ※getUser() はサーバー側でJWTの署名と有効性を検証し、実際のユーザー情報を返します
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    const detail = error?.message ?? 'user not found'
    return c.json(
      {
        error: `Unauthorized: 無効または期限切れのトークンです (${detail})`,
        detail,
      },
      401,
    )
  }
  c.set('user', user)
  c.set('supabase', supabase)

  await next()
})