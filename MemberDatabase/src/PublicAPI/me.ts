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
	discord_user_id: string
	discord_name: string
	display_name: string
	display_grade: string
}>

type MeBody = {
	full_name: string
	discord_name: string | null
	discord_user_id: string | null
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
	discord_user_id?: string
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
const toJsonErrorStatus = (status: number): 409 | 500 => (status === 409 ? 409 : 500)

type DiscordLinkResult = {
	status: 200 | 409 | 500
	message?: string
}

const saveDiscordLink = async (
	supabase: SupabaseClient,
	discordUserId: string,
	discordName?: string,
): Promise<DiscordLinkResult> => {
	const { data, error } = await supabase.rpc('save_current_user_discord_link', {
		p_discord_id: discordUserId,
		p_display_name: discordName,
	})

	if (error) {
		const status = error.code === '23505' ? 409 : 500
		return {
			status,
			message: error.message,
		}
	}

	if (typeof data !== 'string' || data.trim().length === 0) {
		return {
			status: 500,
			message: 'discord link save failed',
		}
	}

	return {
		status: 200,
	}
}



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

	if (!body.discord_user_id || !isSnowflake(body.discord_user_id)) {
		return true
	}

	return false
}

const getMemberIdFromUser = async (user: Variables['user'], supabaseClient: SupabaseClient): Promise<{ memberId: string | null; reason?: string }> => {
	let lastRpcError: string | undefined

	for (let i = 0; i < 2; i += 1) {
		const { data: resolvedByRpc, error: rpcError } = await supabaseClient.rpc('resolve_member_id_for_current_user')
		if (!rpcError && typeof resolvedByRpc === 'string' && resolvedByRpc.trim().length > 0) {
			return { memberId: resolvedByRpc }
		}

		if (rpcError) {
			lastRpcError = rpcError.message
		}
	}

	const appMetadata = user?.app_metadata as Record<string, unknown> | undefined
	const memberIdFromMetadata = appMetadata?.member_id

	if (typeof memberIdFromMetadata === 'string' && memberIdFromMetadata.trim().length > 0) {
		return { memberId: memberIdFromMetadata }
	}

	const auth_id = user?.id

	if (!auth_id) {
		return { memberId: null, reason: lastRpcError ?? 'auth user id is missing' }
	}

	const { data, error } = await supabaseClient
		.from('users')
		.select('member_id')
		.eq('auth_user_id', auth_id)
		.maybeSingle()

	if (error) {
		return { memberId: null, reason: lastRpcError ?? error.message }
	}

	return {
		memberId: data?.member_id ?? null,
		reason: data?.member_id ? undefined : (lastRpcError ?? 'member id not found in users table'),
	}
}

app.post('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient

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

	if (body.discord_user_id !== undefined && (typeof body.discord_user_id !== 'string' || !isSnowflake(body.discord_user_id))) {
		return c.json({ code: 400, message: 'Invalid field: discord_user_id' }, 400)
	}

	if (body.discord_name !== undefined && typeof body.discord_name !== 'string') {
		return c.json({ code: 400, message: 'Invalid field: discord_name' }, 400)
	}

	const { data, error } = await supabase.rpc('save_current_user_registration', {
		p_full_name: body.full_name,
		p_grade: body.grade,
		p_student_id: body.student_id,
		p_emergency_contact: body.emergency_contact,
		p_student_email: body.student_email,
		p_insurance: body.insurance,
		p_some_allergy: body.some_allergy,
		p_discord_name: body.discord_name,
	})

	if (error) {
		return c.json({ code: 500, message: error.message }, 500)
	}

	if (typeof data !== 'string' || data.trim().length === 0) {
		return c.json({ code: 401, message: 'member seed failed' }, 401)
	}

	if (body.discord_user_id !== undefined) {
		const discordLinkResult = await saveDiscordLink(supabase, body.discord_user_id, body.discord_name)
		if (discordLinkResult.message) {
			const status = toJsonErrorStatus(discordLinkResult.status)
			return c.json({ code: status, message: discordLinkResult.message }, status)
		}
	}

	return c.json({ code: 201 }, 201)
})

app.get('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')
	const memberResolution = await getMemberIdFromUser(user, supabase)
	const memberId = memberResolution.memberId
	const authId = user?.id

	if (!memberId) {
		return c.json(
			{ code: 401, message: `member_id resolution failed: ${memberResolution.reason ?? 'unknown reason'}` },
			401,
		)
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

	let discordName: string | null = null
	let discordId: string | null = null

	if (authId) {
		const { data: userRow, error: userError } = await supabase
			.from('users')
			.select('display_name, discord_user_id')
			.eq('auth_user_id', authId)
			.maybeSingle()

		if (userError) {
			return c.json({ code: 500, message: userError.message }, 500)
		}

		discordName = typeof userRow?.display_name === 'string' ? userRow.display_name : null
		discordId = typeof userRow?.discord_user_id === 'string' ? userRow.discord_user_id : null
	}

	const gradesValue = member.grades as { display_grade?: string } | { display_grade?: string }[] | null
	const displayGrade = Array.isArray(gradesValue)
		? (gradesValue[0]?.display_grade ?? '')
		: (gradesValue?.display_grade ?? '')

	const body: MeBody = {
		full_name: String(member.name ?? ''),
		discord_name: discordName,
		discord_user_id: discordId,
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
	const memberResolution = await getMemberIdFromUser(user, supabase)
	const memberId = memberResolution.memberId

	if (!memberId) {
		return c.json(
			{ code: 401, message: `member_id resolution failed: ${memberResolution.reason ?? 'unknown reason'}` },
			401,
		)
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

	for (const key of keys) {
		if (key === 'discord_name') {
			if (typeof patchBody.discord_name !== 'string') {
				return c.json({ code: 400, message: 'discord_name must be string' }, 400)
			}
			continue
		}

		if (key === 'discord_user_id' || key === 'discord_id') {
			const discordUserId = patchBody.discord_user_id ?? patchBody.discord_id
			if (typeof discordUserId !== 'string' || !isSnowflake(discordUserId)) {
				return c.json({ code: 400, message: 'discord_user_id must be a numeric Discord snowflake' }, 400)
			}
			continue
		}

		const column = ALLOWED_PATCH_KEY_TO_COLUMN[key]
		if (!column) {
			return c.json({ code: 400, message: 'Unsupported patch field: ' + key }, 400)
		}
	}

	const { data: patchData, error: patchError } = await supabase.rpc('patch_current_user_member', {
		p_full_name: patchBody.full_name ?? patchBody.name,
		p_grade: patchBody.grade,
		p_student_id: patchBody.student_id,
		p_emergency_contact: patchBody.emergency_contact,
		p_student_email: patchBody.student_email,
		p_insurance: patchBody.insurance,
		p_some_allergy: patchBody.some_allergy,
		p_discord_name: patchBody.discord_name,
	})

	if (patchError) {
		return c.json({ code: 500, message: patchError.message }, 500)
	}

	if (typeof patchData !== 'string' || patchData.trim().length === 0) {
		return c.json({ code: 401, message: 'member patch failed' }, 401)
	}

	const discordUserId = patchBody.discord_user_id ?? patchBody.discord_id
	if (discordUserId !== undefined) {
		const discordLinkResult = await saveDiscordLink(supabase, discordUserId, patchBody.discord_name)
		if (discordLinkResult.message) {
			const status = toJsonErrorStatus(discordLinkResult.status)
			return c.json({ code: status, message: discordLinkResult.message }, status)
		}
	}

	return c.json({ code: 200 }, 200)
})

export default app
