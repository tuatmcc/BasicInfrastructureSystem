import { Hono } from 'hono'
import { Bindings, Variables } from './type'
import { supabaseMiddleware } from './middleware/supabase'
import discordLink from './PublicAPI/discord-link'
import me from './PublicAPI/me'
import members from './PublicAPI/members'
import grades from './PublicAPI/grades'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/v0/*', async (c, next) => supabaseMiddleware(c, next))

app.route('/api/v0/discord-link', discordLink)
app.route('/api/v0/me', me)
app.route('/api/v0/members/me', me)
app.route('/api/v0/grades', grades)
app.route('/api/v0/members', members)

export default app
