"use client";

import { useEffect, useState } from "react";
import { AdminOnly } from "@/components/admin-only";
import { useAuth } from "@/components/auth-provider";

type MemberItem = {
  full_name: string;
  display_name: string | null;
  grade: number;
  display_grade: string;
  student_id: string;
  emergency_contact: string;
  student_email: string;
  insurance: boolean;
  some_allergy: boolean;
};

type MembersResponse = {
  code: number;
  body: Record<string, MemberItem>;
};

export default function MembersPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollYearMin, setEnrollYearMin] = useState("");
  const [enrollYearMax, setEnrollYearMax] = useState("");
  const [someAllergy, setSomeAllergy] = useState<"all" | "true" | "false">("all");
  const [rows, setRows] = useState<Array<{ id: string; item: MemberItem }>>([]);

  async function loadMembers(showLoading: boolean) {
    if (!session?.access_token) {
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError("");

    const query = new URLSearchParams();
    if (enrollYearMin) {
      query.set("enroll_year_min", enrollYearMin);
    }
    if (enrollYearMax) {
      query.set("enroll_year_max", enrollYearMax);
    }
    if (someAllergy !== "all") {
      query.set("some_allergy", someAllergy);
    }

    const url = `/api/memberdb/api/v0/members${query.size > 0 ? `?${query.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      setError(`部員一覧の取得に失敗しました (HTTP ${response.status})`);
      setLoading(false);
      return;
    }

    const json = (await response.json()) as MembersResponse;
    const nextRows = Object.entries(json.body).map(([id, item]) => ({ id, item }));

    setRows(nextRows);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMembers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  return (
    <AdminOnly>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">部員管理</h1>
          <p className="mt-2 text-sm text-slate-600">MemberDatabaseの管理者向け一覧APIを表示します。</p>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
          <input
            type="number"
            placeholder="入学年 最小"
            value={enrollYearMin}
            onChange={(event) => setEnrollYearMin(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="入学年 最大"
            value={enrollYearMax}
            onChange={(event) => setEnrollYearMax(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={someAllergy}
            onChange={(event) => setSomeAllergy(event.target.value as "all" | "true" | "false")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">アレルギー: 全件</option>
            <option value="true">アレルギー: あり</option>
            <option value="false">アレルギー: なし</option>
          </select>
          <button
            type="button"
            onClick={() => void loadMembers(true)}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
          >
            検索
          </button>
        </section>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : null}

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-600">読み込み中...</p>
          ) : (
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-2 py-2">member_id</th>
                  <th className="px-2 py-2">氏名</th>
                  <th className="px-2 py-2">Discord表示名</th>
                  <th className="px-2 py-2">学年</th>
                  <th className="px-2 py-2">学籍番号</th>
                  <th className="px-2 py-2">緊急連絡先</th>
                  <th className="px-2 py-2">学内メール</th>
                  <th className="px-2 py-2">保険</th>
                  <th className="px-2 py-2">アレルギー</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-mono text-xs">{row.id}</td>
                    <td className="px-2 py-2">{row.item.full_name}</td>
                    <td className="px-2 py-2">{row.item.display_name ?? "-"}</td>
                    <td className="px-2 py-2">
                      {row.item.display_grade || row.item.grade}
                    </td>
                    <td className="px-2 py-2">{row.item.student_id}</td>
                    <td className="px-2 py-2">{row.item.emergency_contact}</td>
                    <td className="px-2 py-2">{row.item.student_email}</td>
                    <td className="px-2 py-2">{row.item.insurance ? "あり" : "なし"}</td>
                    <td className="px-2 py-2">{row.item.some_allergy ? "あり" : "なし"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AdminOnly>
  );
}
