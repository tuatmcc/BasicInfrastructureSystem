import { Hono } from 'hono'
import { Bindings, Variables } from './type'
import { supabaseMiddleware } from './middleware/supabase'
import me from './PublicAPI/me'
import members from './PublicAPI/members'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/v0/*', async (c, next) => supabaseMiddleware(c, next))

app.route('/api/v0/me', me)
app.route('/api/v0/members', members)

export default app
