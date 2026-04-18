"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import type { Role } from "@/lib/types";

interface DashboardShellProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", adminOnly: false },
  { href: "/dashboard/members", label: "部員管理", adminOnly: true },
  { href: "/dashboard/discord", label: "Discord管理", adminOnly: true },
  { href: "/dashboard/settings", label: "設定", adminOnly: true },
];

export function DashboardShell({ role, onRoleChange, children }: DashboardShellProps) {
  const pathname = usePathname();
  const isAdmin = role === "Admin";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">MCC Dashboard</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              ロール
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1"
                value={role}
                onChange={(event) => onRoleChange(event.target.value as Role)}
              >
                <option value="一般ユーザー">一般ユーザー</option>
                <option value="Admin">Admin</option>
                <option value="DiscordConnector">DiscordConnector</option>
              </select>
            </label>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border bg-white p-3">
          <nav className="space-y-1">
            {navItems
              .filter((item) => (item.adminOnly ? isAdmin : true))
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded px-3 py-2 text-sm ${
                      active ? "bg-blue-100 text-blue-900" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
