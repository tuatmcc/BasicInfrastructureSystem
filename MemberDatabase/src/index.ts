import { Hono } from 'hono'
import { Bindings, Variables } from './type'
import { supabaseMiddleware } from './middleware/supabase'
import name from './PublicAPI/fullname'


// 認証情報からユーザーIDを取得できるようにするためのTableがそのうち生える。

// Honoのインスタンス生成時に型を渡す
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/v1/*', async (c, next) => supabaseMiddleware(c, next))

app.route('/api/v1/name', name)