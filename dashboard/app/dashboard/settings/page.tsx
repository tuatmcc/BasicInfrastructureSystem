"use client";

import { AdminOnly } from "@/components/admin-only";

export default function SettingsPage() {
  const settings = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? "設定済み" : "未設定",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "設定済み" : "未設定",
    },
    {
      key: "MEMBERDB_API_BASE_URL",
      value: process.env.NEXT_PUBLIC_MEMBERDB_API_BASE_URL ?? "サーバ側環境変数を使用",
    },
    {
      key: "DISCORD_API_BASE_URL",
      value: process.env.NEXT_PUBLIC_DISCORD_API_BASE_URL ?? "サーバ側環境変数を使用",
    },
    {
      key: "DISCORD_OAUTH_CLIENT_ID",
      value: process.env.NEXT_PUBLIC_DISCORD_OAUTH_CLIENT_ID ?? "サーバ側環境変数を使用",
    },
    {
      key: "DISCORD_OAUTH_CLIENT_SECRET",
      value: "サーバ側環境変数を使用",
    },
    {
      key: "DISCORD_OAUTH_STATE_SECRET",
      value: "サーバ側環境変数を使用",
    },
  ];

  return (
    <AdminOnly>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">設定</h1>
          <p className="mt-2 text-sm text-slate-600">
            Dashboardは既存APIエンドポイントを利用します。接続先は環境変数で管理してください。
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ul className="space-y-3 text-sm text-slate-700">
            {settings.map((item) => (
              <li key={item.key} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-mono text-xs text-slate-500">{item.key}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminOnly>
  );
}
