"use client";

import { useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { MemberForm } from "@/components/member-form";
import { DbApiClientError, dbApi } from "@/lib/dbapi";
import { useAuth } from "@/lib/auth-context";
import type { Member, MemberCreateRequest, MemberUpdateRequest, Role } from "@/lib/types";

export default function DashboardPage() {
  const [role, setRole] = useState<Role>("一般ユーザー");
  const { accessToken, userEmail, memberId } = useAuth();
  const [myMember, setMyMember] = useState<Member | null>(null);
  const [message, setMessage] = useState<string>("");

  const canUseAdminFeatures = useMemo(() => role === "Admin", [role]);

  async function loadMyProfile() {
    if (!accessToken) {
      setMessage("先にSupabaseへログインしてください");
      return;
    }
    try {
      const data = await dbApi.getMyMember(accessToken);
      setMyMember(data);
      setMessage("自分の情報を取得しました");
    } catch (error) {
      if (error instanceof DbApiClientError) {
        if (error.status === 404) {
          setMyMember(null);
          setMessage("登録情報がありません。初回登録を実行してください。");
          return;
        }
        setMessage(`取得失敗: ${error.status} ${error.message}`);
      } else {
        setMessage("取得に失敗しました");
      }
    }
  }

  async function createMyProfile(payload: MemberCreateRequest | MemberUpdateRequest) {
    if (!accessToken) {
      setMessage("先にSupabaseへログインしてください");
      return;
    }

    const createPayload = payload as MemberCreateRequest;
    try {
      await dbApi.createMyMember(accessToken, createPayload);
      setMessage("初回登録を作成しました。JWTへmember_idを反映するため再ログインしてください。");
      await loadMyProfile();
    } catch (error) {
      if (error instanceof DbApiClientError) {
        if (error.status === 409) {
          setMessage("既に初回登録済みです。再ログイン後に「自分の情報を取得」を押してください。");
          return;
        }
        setMessage(`作成失敗: ${error.status} ${error.message}`);
      } else {
        setMessage("作成に失敗しました");
      }
    }
  }

  async function updateMyProfile(payload: MemberCreateRequest | MemberUpdateRequest) {
    if (!accessToken) {
      setMessage("先にSupabaseへログインしてください");
      return;
    }
    try {
      const data = await dbApi.patchMyMember(accessToken, payload as MemberUpdateRequest);
      setMyMember(data);
      setMessage("自分の情報を更新しました");
    } catch (error) {
      if (error instanceof DbApiClientError) {
        setMessage(`更新失敗: ${error.status} ${error.message}`);
      } else {
        setMessage("更新に失敗しました");
      }
    }
  }

  return (
    <AuthGuard>
      <DashboardShell role={role} onRoleChange={setRole}>
        <div className="space-y-4">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold">マイページ</h2>
          <p className="mt-1 text-sm text-slate-600">
            一般部員向けに `/members/me` を利用して自分の登録情報を確認・更新します。
          </p>
          <p className="mt-2 rounded bg-slate-100 px-3 py-2 text-xs">ログイン中ユーザー: {userEmail ?? "unknown"}</p>
          <p className="mt-2 text-xs text-slate-500">token.app_metadata.member_id: {memberId ?? "未設定"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded bg-slate-800 px-3 py-2 text-white" onClick={loadMyProfile}>
              自分の情報を取得
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-700">{message}</p>
        </section>

        {!myMember ? (
          <section className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold">初回登録</h3>
            <p className="mt-1 text-xs text-slate-600">
              `POST /members/me` は初回のみ成功し、既に登録済みの場合は `409 Conflict` です。
            </p>
            <div className="mt-3">
              <MemberForm mode="create" submitLabel="初回登録する" onSubmit={createMyProfile} />
            </div>
          </section>
        ) : (
          <section className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold">登録情報の更新</h3>
            <div className="mt-3">
              <MemberForm
                mode="update"
                initialValue={myMember}
                submitLabel="更新する"
                onSubmit={updateMyProfile}
              />
            </div>
          </section>
        )}

        {canUseAdminFeatures ? (
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            管理者としてログイン中です。部員一覧や編集は「部員管理」ページで実行できます。
          </section>
        ) : null}
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
