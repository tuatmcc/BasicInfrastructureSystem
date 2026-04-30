import type { User } from "@supabase/supabase-js";

function normalizeRole(raw: unknown): string | null {
  return typeof raw === "string" ? raw : null;
}

export function getUserRoles(user: User | null): string[] {
  if (!user) {
    return [];
  }

  const metadata = user.app_metadata as Record<string, unknown> | undefined;
  const role = normalizeRole(metadata?.role);
  return role ? [role] : [];
}

export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.some((role) => role === "admin");
}

export function isAdminUser(user: User | null): boolean {
  return hasAdminRole(getUserRoles(user));
}

export function formatRoleNames(roles: readonly string[]): string {
  if (roles.length === 0) {
    return "未設定";
  }

  return roles.join(", ");
}
