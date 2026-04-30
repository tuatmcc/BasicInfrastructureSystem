"use client";

import Link from "next/link";
import { AdminOnly } from "@/components/admin-only";
import { useAuth } from "@/components/auth-provider";

const consoleCards = [
  {
    href: "/dashboard/members",
    title: "MemberDB",
    description: "管理者向け一覧検索とフィルタ確認を行います。",
  },
  {
    href: "/dashboard/discord",
    title: "DiscordConnector",
    description: "ロール・チャンネル・カテゴリを管理します。",
  },
  {
    href: "/dashboard/settings",
    title: "設定",
    description: "接続先と実行環境の確認を行います。",
  },
];

export default function AdminConsolePage() {
  const { user, roles, isAdmin } = useAuth();

  return (
    <AdminOnly>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">管理者コンソール</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            このページは Supabase のロール確認と各APIのサーバー側認可を前提にした管理画面の入口です。
            MemberDB と DiscordConnector の管理系操作は、ここから移動して利用します。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ログイン中</p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-900">{user?.email ?? "-"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">判定ロール</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {roles.length > 0 ? roles.join(", ") : "未設定"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">認可結果</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {isAdmin ? "admin 通過" : "403 対象外"}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {consoleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">運用メモ</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>ダッシュボード側の route handler が Supabase に問い合わせてロールを判定します。</li>
            <li>MemberDB の管理系 API は `admin` ロールのみ通過します。</li>
            <li>ロールの付与は Supabase Auth の `app_metadata.role` で行います。</li>
          </ul>
        </section>
      </div>
    </AdminOnly>
  );
}