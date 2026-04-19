import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'
type Env = {
  Bindings: Bindings
  Variables: Variables
}

export const supabaseMiddleware = createMiddleware<Env>(async (c, next) => {
  
  // ① Cookieから JWT（access_token）を取得
  const token = getCookie(c, 'access_token')

  // ② トークンが無ければ、即座に弾く（401 エラー）
  if (!token) {
    return c.json({ error: 'Unauthorized: ログインが必要です' }, 401)
  }

  // ③ トークンをヘッダーにセットして、Supabaseクライアントを作成
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
  // ④ 【重要】Supabase APIを叩いて、トークンが本物か・期限切れでないかを確認する
  // ※getUser() はサーバー側でJWTの署名と有効性を検証し、実際のユーザー情報を返します
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return c.json({ error: 'Unauthorized: 無効または期限切れのトークンです' }, 401)
  }
  c.set('user', user)
  c.set('supabase', supabase)


  // ⑤ 目的地の処理（ルートのラムダ式）へバトンタッチ！
  await next()
})