import type { User } from '@supabase/supabase-js'

export function getUserRoles(user: User): string[] {
	const appMetadata = user.app_metadata as Record<string, unknown> | undefined
	return appMetadata?.roles as string[] ?? [];
}

export function hasAdminRole(roles: readonly string[]): boolean {
	return roles.some((role) => role === 'admin')
}