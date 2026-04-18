"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { appConfig } from "@/lib/config";
import { dbApi } from "@/lib/dbapi";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

export default function SettingsPage() {
  const [role, setRole] = useState<Role>("Admin");
  const { userEmail } = useAuth();
  const [health, setHealth] = useState("未確認");

  async function checkHealth() {
    try {
      const response = await dbApi.health();
      setHealth(`接続OK: ${response.status}`);
    } catch {
      setHealth("接続NG: dbapi に到達できません");
    }
  }

  return (
    <AuthGuard>
      <DashboardShell role={role} onRoleChange={setRole}>
        <div className="space-y-4">

        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold">API接続設定</h2>
          <p className="mt-1 text-xs text-slate-500">ログイン中ユーザー: {userEmail ?? "unknown"}</p>
          <p className="mt-1 text-sm text-slate-600">
            dbapi 接続先はモノレポ直下 `.env` の `DBAPI_BASE_URL` で設定します。
          </p>
          <p className="mt-2 rounded bg-slate-100 px-3 py-2 font-mono text-xs">{appConfig.dbApiBaseUrl}</p>
          <button className="mt-3 rounded bg-slate-800 px-3 py-2 text-white" onClick={checkHealth}>
            Health Check
          </button>
          <p className="mt-2 text-sm text-slate-700">{health}</p>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold">システム設定（今後実装）</h2>
          <p className="mt-1 text-sm text-slate-600">
            docs/frondend で定義されている設定画面の枠を先に用意し、具体項目は要件確定後に拡張します。
          </p>
        </section>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
