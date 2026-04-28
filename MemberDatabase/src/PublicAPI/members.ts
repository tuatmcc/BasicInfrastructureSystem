import { Hono } from 'hono'
import { SupabaseClient } from '@supabase/supabase-js'
import { Bindings, Variables } from '../type'
import { getUserRoles, hasAdminRole } from '../auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const parseBooleanQuery = (value: string | undefined): boolean | null => {
	if (value === undefined) {
		return null
	}

	if (value === 'true') {
		return true
	}

	if (value === 'false') {
		return false
	}

	return null
}

app.get('/', async (c) => {
	const supabase = c.get('supabase') as SupabaseClient
	const user = c.get('user')

	if (!hasAdminRole(getUserRoles(user))) {
		return c.json({ code: 403, message: 'Forbidden' }, 403)
	}

	const enrollYearMinRaw = c.req.query('enroll_year_min')
	const enrollYearMaxRaw = c.req.query('enroll_year_max')
	const someAllergyRaw = c.req.query('some_allergy')

	const enrollYearMin = enrollYearMinRaw !== undefined ? Number(enrollYearMinRaw) : null
	const enrollYearMax = enrollYearMaxRaw !== undefined ? Number(enrollYearMaxRaw) : null
	const someAllergy = parseBooleanQuery(someAllergyRaw)

	if (enrollYearMinRaw !== undefined && Number.isNaN(enrollYearMin)) {
		return c.json({ code: 400, message: 'enroll_year_min must be number' }, 400)
	}

	if (enrollYearMaxRaw !== undefined && Number.isNaN(enrollYearMax)) {
		return c.json({ code: 400, message: 'enroll_year_max must be number' }, 400)
	}

	if (someAllergyRaw !== undefined && someAllergy === null) {
		return c.json({ code: 400, message: 'some_allergy must be true or false' }, 400)
	}

	let query = supabase
		.from('members')
		.select('member_id, name, grade, emergency_contact, student_id, student_email, insurance, some_allergy, grades(display_grade), users(display_name)')

	if (enrollYearMin !== null) {
		query = query.gte('enroll_year', enrollYearMin)
	}

	if (enrollYearMax !== null) {
		query = query.lte('enroll_year', enrollYearMax)
	}

	if (someAllergy !== null) {
		query = query.eq('some_allergy', someAllergy)
	}

	const { data, error } = await query

	if (error) {
		return c.json({ code: 500, message: error.message }, 500)
	}

	const body: Record<string, {
		full_name: string
		display_name: string | null
		grade: number
		display_grade: string
		student_id: string
		emergency_contact: string
		student_email: string
		insurance: boolean
		some_allergy: boolean
	}> = {}

	for (const member of data ?? []) {
		const gradeValue = member.grades as { display_grade?: string } | { display_grade?: string }[] | null
		const displayGrade = Array.isArray(gradeValue)
			? (gradeValue[0]?.display_grade ?? '')
			: (gradeValue?.display_grade ?? '')

		const usersValue = member.users as { display_name?: string } | { display_name?: string }[] | null
		const displayName = Array.isArray(usersValue)
			? (usersValue[0]?.display_name ?? null)
			: (usersValue?.display_name ?? null)

		body[String(member.member_id)] = {
			full_name: String(member.name ?? ''),
			display_name: displayName,
			grade: Number(member.grade),
			display_grade: displayGrade,
			student_id: String(member.student_id ?? ''),
			emergency_contact: String(member.emergency_contact ?? ''),
			student_email: String(member.student_email ?? ''),
			insurance: Boolean(member.insurance),
			some_allergy: Boolean(member.some_allergy),
		}
	}

	return c.json({ code: 200, body }, 200)
})

export default app
