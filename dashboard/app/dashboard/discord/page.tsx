"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { DbApiClientError, dbApi } from "@/lib/dbapi";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

export default function DiscordPage() {
  const [role, setRole] = useState<Role>("Admin");
  const { accessToken } = useAuth();
  const [discordUserId, setDiscordUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  async function reflectDisplayName() {
    if (!accessToken) {
      setMessage("先にSupabaseへログインしてください");
      return;
    }
    if (!discordUserId || !displayName) {
      setMessage("discord_user_id と表示名を入力してください");
      return;
    }
    try {
      await dbApi.patchDisplayName(accessToken, discordUserId, displayName);
      setMessage("表示名を反映しました（204）");
    } catch (error) {
      if (error instanceof DbApiClientError) {
        setMessage(`反映失敗: ${error.status} ${error.message}`);
      } else {
        setMessage("反映に失敗しました");
      }
    }
  }

  return (
    <AuthGuard>
      <DashboardShell role={role} onRoleChange={setRole}>
        <div className="space-y-4">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold">Discord連携（dbapi範囲）</h2>
          <p className="mt-1 text-sm text-slate-600">
            現時点の dbapi で Discord 連携として定義済みなのは
            `PATCH /users/{'{discord_user_id}'}/display-name` のみです。
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded border border-slate-300 px-3 py-2"
              placeholder="discord_user_id"
              value={discordUserId}
              onChange={(event) => setDiscordUserId(event.target.value)}
            />
            <input
              className="rounded border border-slate-300 px-3 py-2"
              placeholder="display_name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          <button className="mt-3 rounded bg-slate-800 px-3 py-2 text-white" onClick={reflectDisplayName}>
            表示名を反映
          </button>

          <p className="mt-3 text-sm text-slate-700">{message}</p>
        </section>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
