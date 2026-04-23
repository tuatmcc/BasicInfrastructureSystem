import type { SupabaseClient, User } from '@supabase/supabase-js'

// Cloudflare Workersの環境変数（wrangler.jsoncで設定した値）の型
export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_PUBLISHABLE_KEY: string
  SUPABASE_SECRET_KEY?: string
}

// HonoのContext（c.set / c.get）で持ち回る変数の型
export type Variables = {
  supabase: SupabaseClient
  user: User
}