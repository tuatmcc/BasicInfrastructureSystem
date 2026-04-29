import { Hono } from 'hono'
import { SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

type DiscordLinkBody = {
	discord_id: string
	discord_name?: string
}

const isSnowflake = (value: string): boolean => /^\d+$/.test(value.trim())
const isUniqueViolation = (error: { code?: string } | null): boolean => error?.code === '23505'

app.post('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')

	let body: DiscordLinkBody
	try {
		body = await c.req.json<DiscordLinkBody>()
	} catch {
		return c.json({ code: 400, message: 'Invalid JSON body' }, 400)
	}

	if (typeof body.discord_id !== 'string' || !isSnowflake(body.discord_id)) {
		return c.json({ code: 400, message: 'discord_id must be a numeric Discord snowflake' }, 400)
	}

	if (body.discord_name !== undefined && typeof body.discord_name !== 'string') {
		return c.json({ code: 400, message: 'discord_name must be string' }, 400)
	}

	const { data: member, error: memberError } = await supabase
		.from('members')
		.select('member_id')
		.eq('auth_user_id', user.id)
		.maybeSingle()

	if (memberError) {
		return c.json({ code: 500, message: memberError.message }, 500)
	}

	const memberId = typeof member?.member_id === 'string' ? member.member_id : null
	const userRow: Record<string, string | null> = {
		auth_user_id: user.id,
		discord_id: body.discord_id.trim(),
	}

	if (memberId) {
		userRow.member_id = memberId
	}

	if (body.discord_name !== undefined) {
		userRow.display_name = body.discord_name
	}

	const { error } = await supabase
		.from('users')
		.upsert(userRow, { onConflict: 'auth_user_id' })

	if (error) {
		const status = isUniqueViolation(error) ? 409 : 500
		return c.json({ code: status, message: error.message }, status)
	}

	if (body.discord_id.trim().length === 0) {
		return c.json({ code: 401, message: 'discord link save failed' }, 401)
	}

	return c.json({
		code: 200,
		body: {
			discord_id: body.discord_id.trim(),
			discord_name: body.discord_name ?? null,
		},
	}, 200)
})

export default app
