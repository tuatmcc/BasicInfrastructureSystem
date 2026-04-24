"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth-provider";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/dashboard/members", label: "部員管理", adminOnly: true },
  { href: "/dashboard/discord", label: "Discord管理", adminOnly: true },
  { href: "/dashboard/settings", label: "設定", adminOnly: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, session, user, isAdmin } = useAuth();
  const [registrationCheckLoading, setRegistrationCheckLoading] = useState(true);
  const [registered, setRegistered] = useState(false);

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  useEffect(() => {
    const token = session?.access_token;

    if (!token) {
      return;
    }

    let active = true;

    async function fetchRegistrationStatus(accessToken: string) {
      const response = await fetch("/api/memberdb/api/v0/members/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return { response, needsEnrollment: false };
      }

      const json = (await response.json()) as { needs_enrollment?: boolean };
      return { response, needsEnrollment: Boolean(json.needs_enrollment) };
    }

    async function verifyRegistration() {
      setRegistrationCheckLoading(true);

      let currentToken = token;
      let result = await fetchRegistrationStatus(currentToken);

      if (result.response.status === 401 || result.response.status === 404) {
        const { data, error } = await getSupabaseBrowserClient().auth.refreshSession();
        if (!error && data.session?.access_token) {
          currentToken = data.session.access_token;
          result = await fetchRegistrationStatus(currentToken);
        }
      }

      if (!active) {
        return;
      }

      if (result.response.ok) {
        if (result.needsEnrollment) {
          setRegistered(false);
          setRegistrationCheckLoading(false);
          router.replace("/enrollment");
          return;
        }

        setRegistered(true);
        setRegistrationCheckLoading(false);
        return;
      }

      setRegistered(false);
      setRegistrationCheckLoading(false);
      if (result.response.status === 401 || result.response.status === 404) {
        router.replace("/enrollment");
        return;
      }

      router.replace("/");
    }

    void verifyRegistration();

    return () => {
      active = false;
    };
  }, [router, session?.access_token]);

  if (loading) {
    return <p className="p-6 text-sm text-slate-700">認証状態を確認しています...</p>;
  }

  if (!session) {
    router.replace("/");
    return null;
  }

  if (registrationCheckLoading) {
    return <p className="p-6 text-sm text-slate-700">部員登録状態を確認しています...</p>;
  }

  if (!registered) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#cffafe_0%,#e2e8f0_35%,#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">MCC Dashboard</p>
            <p className="text-sm text-slate-600">{user?.email ?? "unknown"}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await getSupabaseBrowserClient().auth.signOut();
              router.replace("/");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
