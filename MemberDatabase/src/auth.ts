import type { User } from '@supabase/supabase-js'

function normalizeRole(raw: unknown): string | null {
	return typeof raw === 'string' ? raw : null
}

export function getUserRoles(user: User): string[] {
	const appMetadata = user.app_metadata as Record<string, unknown> | undefined
	const role = normalizeRole(appMetadata?.role)
	return role ? [role] : []
}

export function hasAdminRole(roles: readonly string[]): boolean {
	return roles.some((role) => role === 'admin')
}