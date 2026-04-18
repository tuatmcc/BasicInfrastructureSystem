"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { MemberForm } from "@/components/member-form";
import { DbApiClientError, dbApi } from "@/lib/dbapi";
import { useAuth } from "@/lib/auth-context";
import type { Member, MemberCreateRequest, MemberUpdateRequest, Role } from "@/lib/types";

export default function MembersPage() {
  const [role, setRole] = useState<Role>("Admin");
  const { accessToken, roles } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [allergyOnly, setAllergyOnly] = useState(false);
  const [message, setMessage] = useState("");

  async function loadMembers() {
    if (!accessToken) {
      setMessage("先にSupabaseへログインしてください");
      return;
    }
    try {
      const grades = gradeFilter
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value));

      const data = await dbApi.listMembers(accessToken, {
        grade: grades.length > 0 ? grades : undefined,
        some_allergy: allergyOnly ? true : undefined,
        sort_by: "updated_at",
        sort_order: "desc",
      });

      setMembers(data);
      setMessage(`${data.length}件の部員情報を取得しました`);
    } catch (error) {
      if (error instanceof DbApiClientError) {
        setMessage(`一覧取得失敗: ${error.status} ${error.message}`);
      } else {
        setMessage("一覧取得に失敗しました");
      }
    }
  }

  async function patchSelected(payload: MemberCreateRequest | MemberUpdateRequest) {
    if (!selectedMemberId) {
      setMessage("更新対象 member_id を選択してください");
      return;
    }
    if (!accessToken) {
      setMessage("先にSupabaseへログインしてください");
      return;
    }
    try {
      const updated = await dbApi.patchMemberById(accessToken, selectedMemberId, payload as MemberUpdateRequest);
      setMembers((prev) => prev.map((member) => (member.member_id === updated.member_id ? updated : member)));
      setMessage(`member_id=${updated.member_id} を更新しました`);
    } catch (error) {
      if (error instanceof DbApiClientError) {
        setMessage(`更新失敗: ${error.status} ${error.message}`);
      } else {
        setMessage("更新に失敗しました");
      }
    }
  }

  const isAdmin = role === "Admin";
  const tokenHasAdminRole = roles.includes("Admin");

  return (
    <AuthGuard>
      <DashboardShell role={role} onRoleChange={setRole}>
        <div className="space-y-4">
        {!isAdmin ? (
          <section className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            このページは Admin ロール専用です。ロールを Admin に切り替えてください。
          </section>
        ) : null}
        {!tokenHasAdminRole ? (
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            トークンに Admin ロールがありません。dbapi 側で 403 が返る可能性があります。
          </section>
        ) : null}

        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-base font-semibold">部員一覧（Admin）</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              className="rounded border border-slate-300 px-3 py-2"
              placeholder="学年フィルタ（例: 1,2,3）"
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allergyOnly}
                onChange={(event) => setAllergyOnly(event.target.checked)}
              />
              アレルギーありのみ
            </label>
            <button className="rounded bg-slate-800 px-3 py-2 text-white" onClick={loadMembers}>
              一覧取得
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-700">{message}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border px-2 py-1 text-left">選択</th>
                  <th className="border px-2 py-1 text-left">member_id</th>
                  <th className="border px-2 py-1 text-left">氏名</th>
                  <th className="border px-2 py-1 text-left">学年</th>
                  <th className="border px-2 py-1 text-left">学籍番号</th>
                  <th className="border px-2 py-1 text-left">メール</th>
                  <th className="border px-2 py-1 text-left">更新日時</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.member_id}>
                    <td className="border px-2 py-1">
                      <input
                        type="radio"
                        name="selected-member"
                        checked={selectedMemberId === member.member_id}
                        onChange={() => setSelectedMemberId(member.member_id)}
                      />
                    </td>
                    <td className="border px-2 py-1 font-mono text-xs">{member.member_id}</td>
                    <td className="border px-2 py-1">{member.name}</td>
                    <td className="border px-2 py-1">{member.grade}</td>
                    <td className="border px-2 py-1">{member.student_id}</td>
                    <td className="border px-2 py-1">{member.student_email}</td>
                    <td className="border px-2 py-1">{new Date(member.updated_at).toLocaleString("ja-JP")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">選択部員の更新</h3>
          <p className="mt-1 text-xs text-slate-600">`PATCH /members/{'{member_id}'}` を実行します。</p>
          <div className="mt-3">
            <MemberForm mode="update" submitLabel="選択部員を更新" onSubmit={patchSelected} />
          </div>
        </section>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
