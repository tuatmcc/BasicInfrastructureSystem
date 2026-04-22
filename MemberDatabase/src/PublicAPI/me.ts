import { Hono } from 'hono'
import { SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

type PatchBody = Partial<{
	full_name: string
	name: string
	grade: number
	student_id: string
	emergency_contact: string
	student_email: string
	insurance: boolean
	some_allergy: boolean
	display_name: string
	display_grade: string
}>

type MeUpsertBody = {
	full_name: string
	discord_name: string
	grade: number
	display_grade?: string
	student_id: string
	emergency_contact: string
	student_email: string
	insurance: boolean
	some_allergy: boolean
}

const FORBIDDEN_PATCH_KEYS = new Set(['display_name', 'display_grade', 'discord_name'])
const ALLOWED_PATCH_KEY_TO_COLUMN: Record<string, string> = {
	full_name: 'name',
	name: 'name',
	grade: 'grade',
	student_id: 'student_id',
	emergency_contact: 'emergency_contact',
	student_email: 'student_email',
	insurance: 'insurance',
	some_allergy: 'some_allergy',
}

const getMemberIdFromUser = async (user: Variables['user'], supabaseClient: SupabaseClient): Promise<string | null> => {
	const auth_id = user?.id

	if (!auth_id) {
		return null
	}

	const { data, error } = await supabaseClient
		.from('users')
		.select('member_id')
		.eq('auth_user_id', auth_id)
		.maybeSingle()

	if (error) {
		return null
	}

	return data?.member_id ?? null
}

const normalizeMeRequestBody = (payload: unknown): Partial<MeUpsertBody> | null => {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return null
	}

	const raw = payload as Record<string, unknown>
	const source = raw.body && typeof raw.body === 'object' && !Array.isArray(raw.body)
		? (raw.body as Record<string, unknown>)
		: raw

	return source as Partial<MeUpsertBody>
}

app.post('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')
	const authId = user?.id

	if (!authId) {
		return c.json({ code: 401, message: 'Unauthorized' }, 401)
	}

	let payload: unknown
	try {
		payload = await c.req.json()
	} catch {
		return c.json({ code: 400, message: 'Invalid JSON body' }, 400)
	}

	const body = normalizeMeRequestBody(payload)
	if (!body) {
		return c.json({ code: 400, message: 'Body must be a JSON object' }, 400)
	}

	const requiredKeys: (keyof MeUpsertBody)[] = [
		'full_name',
		'discord_name',
		'grade',
		'student_id',
		'emergency_contact',
		'student_email',
		'insurance',
		'some_allergy',
	]

	for (const key of requiredKeys) {
		if (body[key] === undefined || body[key] === null) {
			return c.json({ code: 400, message: 'Missing field: ' + key }, 400)
		}
	}

	if (typeof body.full_name !== 'string' || typeof body.discord_name !== 'string' || typeof body.student_id !== 'string' || typeof body.emergency_contact !== 'string' || typeof body.student_email !== 'string') {
		return c.json({ code: 400, message: 'Invalid field types' }, 400)
	}

	if (typeof body.grade !== 'number' || typeof body.insurance !== 'boolean' || typeof body.some_allergy !== 'boolean') {
		return c.json({ code: 400, message: 'Invalid field types' }, 400)
	}

	const { data: existing, error: existingError } = await supabase
		.from('users')
		.select('member_id')
		.eq('auth_user_id', authId)
		.maybeSingle()

	if (existingError) {
		return c.json({ code: 500, message: existingError.message }, 500)
	}

	if (existing?.member_id) {
		return c.json({ code: 409, message: 'Already registered' }, 409)
	}

	const { data: memberRow, error: insertMemberError } = await supabase
		.from('members')
		.insert({
			name: body.full_name,
			grade: body.grade,
			emergency_contact: body.emergency_contact,
			student_id: body.student_id,
			student_email: body.student_email,
			insurance: body.insurance,
			some_allergy: body.some_allergy,
		})
		.select('member_id')
		.single()

	if (insertMemberError) {
		return c.json({ code: 500, message: insertMemberError.message }, 500)
	}

	const { error: upsertUserError } = await supabase
		.from('users')
		.upsert(
			{
				auth_user_id: authId,
				member_id: memberRow.member_id,
				display_name: body.discord_name,
			},
			{ onConflict: 'auth_user_id' },
		)

	if (upsertUserError) {
		return c.json({ code: 500, message: upsertUserError.message }, 500)
	}

	return c.json({ code: 201 }, 201)
})

app.get('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')
	const memberId = await getMemberIdFromUser(user, supabase)

	if (!memberId) {
		return c.json({ code: 401, message: 'member_id is not found in app_metadata' }, 401)
	}

	const { data: member, error: memberError } = await supabase
		.from('members')
		.select('name, grade, emergency_contact, student_id, student_email, insurance, some_allergy, grades(display_grade)')
		.eq('member_id', memberId)
		.maybeSingle()

	if (memberError) {
		return c.json({ code: 500, message: memberError.message }, 500)
	}

	if (!member) {
		return c.json({ code: 404, message: 'Member not found' }, 404)
	}

	const { data: userRow, error: userError } = await supabase
		.from('users')
		.select('display_name')
		.eq('member_id', memberId)
		.maybeSingle()

	if (userError) {
		return c.json({ code: 500, message: userError.message }, 500)
	}

	const gradesValue = member.grades as { display_grade?: string } | { display_grade?: string }[] | null
	const displayGrade = Array.isArray(gradesValue)
		? (gradesValue[0]?.display_grade ?? '')
		: (gradesValue?.display_grade ?? '')

	return c.json(
		{
			code: 200,
			body: {
				full_name: member.name,
				discord_name: userRow?.display_name ?? null,
				grade: member.grade,
				display_grade: displayGrade,
				student_id: member.student_id,
				emergency_contact: member.emergency_contact,
				student_email: member.student_email,
				insurance: member.insurance,
				some_allergy: member.some_allergy,
			},
		},
		200,
	)
})

app.patch('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')
	const memberId = await getMemberIdFromUser(user, supabase)

	if (!memberId) {
		return c.json({ code: 401, message: 'member_id is not found in app_metadata' }, 401)
	}

	let patchBody: PatchBody
	try {
		patchBody = await c.req.json<PatchBody>()
	} catch {
		return c.json({ code: 400, message: 'Invalid JSON body' }, 400)
	}

	if (!patchBody || typeof patchBody !== 'object' || Array.isArray(patchBody)) {
		return c.json({ code: 400, message: 'Body must be a JSON object' }, 400)
	}

	const keys = Object.keys(patchBody)
	if (keys.length === 0) {
		return c.json({ code: 400, message: 'PATCH body is empty' }, 400)
	}

	if (keys.some((key) => FORBIDDEN_PATCH_KEYS.has(key))) {
		return c.json({ code: 400, message: 'display_name and display_grade cannot be patched' }, 400)
	}

	const updatePayload: Record<string, unknown> = {}
	for (const key of keys) {
		const column = ALLOWED_PATCH_KEY_TO_COLUMN[key]
		if (!column) {
			return c.json({ code: 400, message: 'Unsupported patch field: ' + key }, 400)
		}
		updatePayload[column] = patchBody[key as keyof PatchBody]
	}

	const { error } = await supabase
		.from('members')
		.update(updatePayload)
		.eq('member_id', memberId)

	if (error) {
		return c.json({ code: 500, message: error.message }, 500)
	}

	return c.json({ code: 200 }, 200)
})

export default app

