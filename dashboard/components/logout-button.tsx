"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { dbApi } from "@/lib/dbapi";

export function LogoutButton() {
  const router = useRouter();
  const { logout, accessToken } = useAuth();

  async function handleLogout() {
    if (accessToken) {
      await dbApi.authLogout(accessToken).catch(() => undefined);
    }
    await logout();
    router.replace("/login");
  }

  return (
    <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100" onClick={handleLogout}>
      ログアウト
    </button>
  );
}
