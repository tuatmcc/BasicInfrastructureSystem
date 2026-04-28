import { Hono } from 'hono'
import { SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

type DiscordLinkBody = {
	discord_id: string
	discord_name?: string
}

const isSnowflake = (value: string): boolean => /^\d+$/.test(value.trim())

app.post('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient

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

	const { data, error } = await supabase.rpc('save_current_user_discord_link', {
		p_discord_id: body.discord_id,
		p_display_name: body.discord_name,
	})

	if (error) {
		const status = error.code === '23505' ? 409 : 500
		return c.json({ code: status, message: error.message }, status)
	}

	if (typeof data !== 'string' || data.trim().length === 0) {
		return c.json({ code: 401, message: 'discord link save failed' }, 401)
	}

	return c.json({
		code: 200,
		body: {
			discord_id: data,
			discord_name: body.discord_name ?? null,
		},
	}, 200)
})

export default app
