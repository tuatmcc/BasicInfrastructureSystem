import { Hono } from 'hono'
import { SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient

	const { data, error } = await supabase
		.from('grades')
		.select('id, display_grade')
		.order('id', { ascending: true })

	if (error) {
		return c.json({ code: 500, message: error.message }, 500)
	}

	const body: Record<string, string> = {}
	for (const row of data ?? []) {
		body[String(row.id)] = String(row.display_grade ?? '')
	}

	return c.json({ code: 200, body }, 200)
})

export default app
