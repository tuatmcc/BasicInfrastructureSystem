"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DiscordLinkPanel } from "@/components/discord-link-panel";
import { SearchableDropdown } from "@/components/searchable-dropdown";
import { normalizeGradeOptions, type GradeOption } from "@/lib/grade-options";

type MeBody = {
  full_name: string;
  discord_name: string | null;
  discord_id: string | null;
  grade: number;
  display_grade: string;
  student_id: string;
  emergency_contact: string;
  student_email: string;
  insurance: boolean;
  some_allergy: boolean;
};

type MeResponse = {
  code: number;
  body: MeBody;
  needs_enrollment?: boolean;
};

type EditableMeForm = {
  full_name: string;
  grade: string;
  student_id: string;
  emergency_contact: string;
  student_email: string;
  insurance: "true" | "false";
  some_allergy: "true" | "false";
};

function toEditableForm(body: MeBody): EditableMeForm {
  return {
    full_name: body.full_name,
    grade: String(body.grade),
    student_id: body.student_id,
    emergency_contact: body.emergency_contact,
    student_email: body.student_email,
    insurance: body.insurance ? "true" : "false",
    some_allergy: body.some_allergy ? "true" : "false",
  };
}

type GradesResponse = unknown;

async function readError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message ?? json.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [me, setMe] = useState<MeBody | null>(null);
  const [form, setForm] = useState<EditableMeForm | null>(null);
  const [grades, setGrades] = useState<GradeOption[]>([]);

  useEffect(() => {
    async function loadMe() {
      if (!session?.access_token) {
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/memberdb/api/v0/members/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (response.status === 404) {
        setError("部員情報が未登録です。トップページの新規登録から登録してください。");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(await readError(response));
        setLoading(false);
        return;
      }

      const json = (await response.json()) as MeResponse;
      if (json.needs_enrollment) {
        router.replace("/enrollment");
        return;
      }

      const gradesResponse = await fetch("/api/memberdb/api/v0/grades", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (!gradesResponse.ok) {
        setError(await readError(gradesResponse));
        setLoading(false);
        return;
      }

      setMe(json.body);
      setForm(toEditableForm(json.body));
      setGrades(normalizeGradeOptions((await gradesResponse.json()) as GradesResponse));
      setLoading(false);
    }

    void loadMe();
  }, [router, session?.access_token]);

  const gradeDropdownOptions = useMemo(
    () => grades.map((item) => ({ value: String(item.id), label: item.displayGrade })),
    [grades],
  );

  const readonlyRows = useMemo(
    () => [
      { label: "Discord表示名", value: me?.discord_name ?? "未設定" },
      { label: "Discord ID", value: me?.discord_id ?? "未連携" },
      { label: "表示学年", value: me?.display_grade ?? "-" },
      { label: "権限", value: isAdmin ? "管理者" : "一般部員" },
      { label: "ログインメール", value: user?.email ?? "-" },
    ],
    [isAdmin, me?.discord_id, me?.discord_name, me?.display_grade, user?.email],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.access_token || !form) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch("/api/memberdb/api/v0/members/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        full_name: form.full_name,
        grade: Number(form.grade),
        student_id: form.student_id,
        emergency_contact: form.emergency_contact,
        student_email: form.student_email,
        insurance: form.insurance === "true",
        some_allergy: form.some_allergy === "true",
      }),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setMessage("更新しました。");
  }

  if (loading) {
    return <p className="text-sm text-slate-700">読み込み中...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">マイページ</h1>
        <p className="mt-2 text-sm text-slate-600">
          部員情報の確認と更新を行います。Discord連携はこの画面から更新できます。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {readonlyRows.map((row) => (
          <div key={row.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{row.value}</p>
          </div>
        ))}
      </section>

      {session?.access_token && me ? (
        <DiscordLinkPanel
          accessToken={session.access_token}
          currentDiscordId={me.discord_id}
          currentDiscordName={me.discord_name}
          title="Discord連携"
          description="Discordで再認証し、所属サーバーへの参加が確認できたアカウントだけを保存します。"
          returnTo="/dashboard"
          onLinked={({ discordId, discordName }) => {
            setMe((prev) =>
              prev
                ? {
                    ...prev,
                    discord_id: discordId,
                    discord_name: discordName,
                  }
                : prev,
            );
          }}
        />
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {form ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"
        >
          <label className="text-sm text-slate-700">
            氏名
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(event) => setForm((prev) => prev && { ...prev, full_name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <SearchableDropdown
            label="学年"
            placeholder="学年を選択"
            searchPlaceholder="学年で検索"
            options={gradeDropdownOptions}
            value={form.grade}
            onChange={(value) => setForm((prev) => prev && { ...prev, grade: value })}
          />
          <label className="text-sm text-slate-700">
            緊急連絡先
            <input
              type="text"
              required
              value={form.emergency_contact}
              onChange={(event) =>
                setForm((prev) => prev && { ...prev, emergency_contact: event.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            学籍番号
            <input
              type="text"
              required
              value={form.student_id}
              onChange={(event) => setForm((prev) => prev && { ...prev, student_id: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            学内メールアドレス
            <input
              type="email"
              required
              value={form.student_email}
              onChange={(event) =>
                setForm((prev) => prev && { ...prev, student_email: event.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            保険加入
            <select
              value={form.insurance}
              onChange={(event) => setForm((prev) => prev && { ...prev, insurance: event.target.value as "true" | "false" })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="true">あり</option>
              <option value="false">なし</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            アレルギー
            <select
              value={form.some_allergy}
              onChange={(event) =>
                setForm((prev) => prev && { ...prev, some_allergy: event.target.value as "true" | "false" })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="true">あり</option>
              <option value="false">なし</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              更新
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
