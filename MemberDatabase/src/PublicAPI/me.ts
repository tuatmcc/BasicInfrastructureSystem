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
	discord_id: string
	discord_name: string
	display_name: string
	display_grade: string
}>

type MeBody = {
	full_name: string
	discord_name: string | null
	discord_id: string | null
	grade: number
	display_grade: string
	student_id: string
	emergency_contact: string
	student_email: string
	insurance: boolean
	some_allergy: boolean
}

type RegistrationBody = {
	full_name: string
	discord_id?: string
	discord_name?: string
	grade: number
	student_id: string
	emergency_contact: string
	student_email: string
	insurance: boolean
	some_allergy: boolean
}

const FORBIDDEN_PATCH_KEYS = new Set(['display_name', 'display_grade'])
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

const isBlank = (value: string): boolean => value.trim().length === 0
const isSnowflake = (value: string): boolean => /^\d+$/.test(value.trim())
const isUniqueViolation = (error: { code?: string } | null): boolean => error?.code === '23505'

const needsEnrollment = (body: MeBody): boolean => {
	if (isBlank(body.full_name)) {
		return true
	}

	if (isBlank(body.student_id) || isBlank(body.emergency_contact) || isBlank(body.student_email)) {
		return true
	}

	if (!Number.isFinite(body.grade) || body.grade <= 0) {
		return true
	}

	if (!body.discord_id || !isSnowflake(body.discord_id)) {
		return true
	}

	return false
}

const saveUserLink = async (
	supabaseClient: SupabaseClient,
	authUserId: string,
	options: {
		discordId?: string
		discordName?: string
		memberId?: string
	},
): Promise<
	| { message: null; status: 200 }
	| { message: string; status: 409 | 500 }
> => {
	const userRow: Record<string, string | null> = {
		auth_user_id: authUserId,
	}

	if (options.memberId !== undefined) {
		userRow.member_id = options.memberId
	}

	if (options.discordId !== undefined) {
		userRow.discord_id = options.discordId.trim()
	}

	if (options.discordName !== undefined) {
		userRow.display_name = options.discordName
	}

	const { error } = await supabaseClient
		.from('users')
		.upsert(userRow, { onConflict: 'auth_user_id' })

	if (!error) {
		return { message: null, status: 200 }
	}

	return {
		message: error.message,
		status: isUniqueViolation(error) ? 409 : 500,
	}
}

app.post('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')

	let body: RegistrationBody
	try {
		body = await c.req.json<RegistrationBody>()
	} catch {
		return c.json({ code: 400, message: 'Invalid JSON body' }, 400)
	}

	const requiredStringKeys: Array<keyof RegistrationBody> = [
		'full_name',
		'student_id',
		'emergency_contact',
		'student_email',
	]

	for (const key of requiredStringKeys) {
		if (typeof body[key] !== 'string' || body[key].trim().length === 0) {
			return c.json({ code: 400, message: 'Invalid field: ' + key }, 400)
		}
	}

	if (typeof body.grade !== 'number' || !Number.isFinite(body.grade) || body.grade <= 0) {
		return c.json({ code: 400, message: 'Invalid field: grade' }, 400)
	}

	if (typeof body.insurance !== 'boolean' || typeof body.some_allergy !== 'boolean') {
		return c.json({ code: 400, message: 'Invalid boolean fields' }, 400)
	}

	if (body.discord_id !== undefined && (typeof body.discord_id !== 'string' || !isSnowflake(body.discord_id))) {
		return c.json({ code: 400, message: 'Invalid field: discord_id' }, 400)
	}

	if (body.discord_name !== undefined && typeof body.discord_name !== 'string') {
		return c.json({ code: 400, message: 'Invalid field: discord_name' }, 400)
	}

	const memberFields = {
		name: body.full_name,
		grade: body.grade,
		student_id: body.student_id,
		emergency_contact: body.emergency_contact,
		student_email: body.student_email,
		insurance: body.insurance,
		some_allergy: body.some_allergy,
	}

	const { data: updatedMember, error: updateError } = await supabase
		.from('members')
		.update(memberFields)
		.eq('auth_user_id', user.id)
		.select('member_id')
		.maybeSingle()

	if (updateError) {
		return c.json({ code: 500, message: updateError.message }, 500)
	}

	let memberId = typeof updatedMember?.member_id === 'string' ? updatedMember.member_id : null
	if (!memberId) {
		const { data: insertedMember, error: insertError } = await supabase
			.from('members')
			.insert({
				auth_user_id: user.id,
				...memberFields,
			})
			.select('member_id')
			.single()

		if (insertError) {
			const status = isUniqueViolation(insertError) ? 409 : 500
			return c.json({ code: status, message: insertError.message }, status)
		}

		memberId = typeof insertedMember?.member_id === 'string' ? insertedMember.member_id : null
		if (!memberId) {
			return c.json({ code: 500, message: 'member registration failed' }, 500)
		}
	}

	const userLinkResult = await saveUserLink(supabase, user.id, {
		discordId: body.discord_id,
		discordName: body.discord_name,
		memberId,
	})
	if (userLinkResult.message) {
		return c.json({ code: userLinkResult.status, message: userLinkResult.message }, userLinkResult.status)
	}

	return c.json({ code: 201 }, 201)
})

app.get('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')

	const { data: member, error: memberError } = await supabase
		.from('members')
		.select('name, grade, emergency_contact, student_id, student_email, insurance, some_allergy, grades(display_grade)')
		.eq('auth_user_id', user.id)
		.maybeSingle()

	if (memberError) {
		return c.json({ code: 500, message: memberError.message }, 500)
	}

	if (!member) {
		return c.json({ code: 404, message: 'Member not found' }, 404)
	}

	const { data: userRow, error: userError } = await supabase
		.from('users')
		.select('display_name, discord_id')
		.eq('auth_user_id', user.id)
		.maybeSingle()

	if (userError) {
		return c.json({ code: 500, message: userError.message }, 500)
	}

	const gradesValue = member.grades as { display_grade?: string } | { display_grade?: string }[] | null
	const displayGrade = Array.isArray(gradesValue)
		? (gradesValue[0]?.display_grade ?? '')
		: (gradesValue?.display_grade ?? '')

	const body: MeBody = {
		full_name: String(member.name ?? ''),
		discord_name: typeof userRow?.display_name === 'string' ? userRow.display_name : null,
		discord_id: typeof userRow?.discord_id === 'string' ? userRow.discord_id : null,
		grade: Number(member.grade),
		display_grade: displayGrade,
		student_id: String(member.student_id ?? ''),
		emergency_contact: String(member.emergency_contact ?? ''),
		student_email: String(member.student_email ?? ''),
		insurance: Boolean(member.insurance),
		some_allergy: Boolean(member.some_allergy),
	}

	return c.json({ code: 200, body, needs_enrollment: needsEnrollment(body) }, 200)
})

app.patch('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')

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

	const memberPatch: Record<string, string | number | boolean> = {}

	for (const key of keys) {
		if (key === 'discord_name') {
			if (typeof patchBody.discord_name !== 'string') {
				return c.json({ code: 400, message: 'discord_name must be string' }, 400)
			}
			continue
		}

		if (key === 'discord_id') {
			if (typeof patchBody.discord_id !== 'string' || !isSnowflake(patchBody.discord_id)) {
				return c.json({ code: 400, message: 'discord_id must be a numeric Discord snowflake' }, 400)
			}
			continue
		}

		const column = ALLOWED_PATCH_KEY_TO_COLUMN[key]
		if (!column) {
			return c.json({ code: 400, message: 'Unsupported patch field: ' + key }, 400)
		}

		const value = patchBody[key as keyof PatchBody]
		if (value !== undefined) {
			memberPatch[column] = value
		}
	}

	let memberId: string | null = null
	if (Object.keys(memberPatch).length > 0) {
		const { data: member, error: memberError } = await supabase
			.from('members')
			.update(memberPatch)
			.eq('auth_user_id', user.id)
			.select('member_id')
			.maybeSingle()

		if (memberError) {
			return c.json({ code: 500, message: memberError.message }, 500)
		}

		memberId = typeof member?.member_id === 'string' ? member.member_id : null
		if (!memberId) {
			return c.json({ code: 404, message: 'Member not found' }, 404)
		}
	}

	if (patchBody.discord_id !== undefined || patchBody.discord_name !== undefined) {
		if (!memberId) {
			const { data: member, error: memberError } = await supabase
				.from('members')
				.select('member_id')
				.eq('auth_user_id', user.id)
				.maybeSingle()

			if (memberError) {
				return c.json({ code: 500, message: memberError.message }, 500)
			}

			memberId = typeof member?.member_id === 'string' ? member.member_id : null
		}

		const discordLinkResult = await saveUserLink(supabase, user.id, {
			discordId: patchBody.discord_id,
			discordName: patchBody.discord_name,
			memberId: memberId ?? undefined,
		})
		if (discordLinkResult.message) {
			return c.json({ code: discordLinkResult.status, message: discordLinkResult.message }, discordLinkResult.status)
		}
	}

	return c.json({ code: 200 }, 200)
})

export default app
