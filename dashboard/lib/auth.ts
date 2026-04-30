import type { User } from "@supabase/supabase-js";

function normalizeRole(raw: unknown): string | null {
  return typeof raw === "string" ? raw : null;
}

export function getUserRoles(user: User | null): string[] {
  if (!user) {
    return [];
  }

  const metadata = user.app_metadata as Record<string, unknown> | undefined;
  const role = metadata?.roles
  console.log("getUserRoles", { role });
  return metadata?.roles as string[] ?? [];
}

export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.some((role) => role === "admin");
}