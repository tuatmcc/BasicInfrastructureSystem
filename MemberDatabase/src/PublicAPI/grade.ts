// src/routes/projects.ts
import { Hono } from 'hono'
import { Bindings, Variables } from '../type'
import { SupabaseClient } from '@supabase/supabase-js'

// 新しいHonoインスタンスを作成（型定義はindex.tsと同じものを指定）
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()


app.get('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	// ログイン中のユーザーの学年を取得
})

app.patch('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
})
// 最後にこのappをエクスポートする
export default app