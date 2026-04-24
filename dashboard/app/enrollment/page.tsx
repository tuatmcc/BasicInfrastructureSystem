"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SearchableDropdown } from "@/components/searchable-dropdown";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { normalizeGradeOptions, type GradeOption } from "@/lib/grade-options";
import type { User } from "@supabase/supabase-js";

type DiscordMember = {
  id: string;
  name: string;
};

type EnrollmentForm = {
  name: string;
  gradeId: string;
  emergency_call: string;
  student_id: string;
  student_email: string;
  insurance: "" | "true" | "false";
  some_allergy: "" | "true" | "false";
  discord_name: string;
};

const initialForm: EnrollmentForm = {
  name: "",
  gradeId: "",
  emergency_call: "",
  student_id: "",
  student_email: "",
  insurance: "",
  some_allergy: "",
  discord_name: "",
};

type MeBody = {
  full_name: string;
  discord_name: string | null;
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

function discordCandidatesFromUser(user: User | null | undefined): DiscordMember[] {
  if (!user) {
    return [];
  }

  const rawMetadata = user.user_metadata;
  const metadata =
    rawMetadata && typeof rawMetadata === "object"
      ? (rawMetadata as Record<string, unknown>)
      : undefined;

  const candidateNames = [
    metadata?.preferred_username,
    metadata?.user_name,
    metadata?.name,
    metadata?.full_name,
    metadata?.nick_name,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const uniqueNames = [...new Set(candidateNames)];
  if (uniqueNames.length === 0) {
    return [];
  }

  return uniqueNames.map((name) => ({
    id: user.id,
    name,
  }));
}

async function parseError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string; error?: string };
    return json.message ?? json.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export default function EnrollmentPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [booting, setBooting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([]);
  const [form, setForm] = useState<EnrollmentForm>(initialForm);

  useEffect(() => {
    if (loading) {
      return;
    }

    const token = session?.access_token;

    if (!token) {
      router.replace("/");
      return;
    }

    let active = true;

    async function bootstrap() {
      setBooting(true);
      setError("");
      setWarning("");

      const meResponse = await fetch("/api/memberdb/api/v0/members/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!active) {
        return;
      }

      if (meResponse.ok) {
        const meJson = (await meResponse.json()) as MeResponse;

        if (!meJson.needs_enrollment) {
          router.replace("/dashboard");
          return;
        }

        setForm((prev) => ({
          ...prev,
          name: meJson.body.full_name,
          gradeId: meJson.body.grade > 0 ? String(meJson.body.grade) : "",
          emergency_call: meJson.body.emergency_contact,
          student_id: meJson.body.student_id,
          student_email: meJson.body.student_email,
          insurance: meJson.body.insurance ? "true" : "false",
          some_allergy: meJson.body.some_allergy ? "true" : "false",
          discord_name: meJson.body.discord_name ?? "",
        }));

        setBooting(false);
        return;
      }

      if (meResponse.status !== 401 && meResponse.status !== 404) {
        setError(`登録状態の確認に失敗しました: ${await parseError(meResponse)}`);
        setBooting(false);
        return;
      }

      const gradesResponse = await fetch("/api/memberdb/api/v0/grades", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!active) {
        return;
      }

      if (!gradesResponse.ok) {
        setError(`学年一覧の取得に失敗しました: ${await parseError(gradesResponse)}`);
        setBooting(false);
        return;
      }

      const normalizedGrades = normalizeGradeOptions(await gradesResponse.json());
      setGrades(normalizedGrades);
      if (normalizedGrades.length === 0) {
        setWarning("学年候補が0件でした。MemberDBのgradesデータまたはレスポンス形式を確認してください。");
      }

      const localDiscordCandidates = discordCandidatesFromUser(session?.user);
      let remoteDiscordCandidates: DiscordMember[] = [];

      try {
        const discordResponse = await fetch("/api/discord/api/v0/member/list", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (discordResponse.ok) {
          const discordJson = (await discordResponse.json()) as unknown;
          if (Array.isArray(discordJson)) {
            remoteDiscordCandidates = discordJson
              .map((item) => {
                if (!item || typeof item !== "object") {
                  return null;
                }
                const row = item as { id?: unknown; name?: unknown };
                if (typeof row.id !== "string" || typeof row.name !== "string") {
                  return null;
                }
                return { id: row.id, name: row.name };
              })
              .filter((item): item is DiscordMember => item !== null);
          }
        } else {
          setWarning(`Discord候補の取得に失敗しました: ${await parseError(discordResponse)}`);
        }
      } catch {
        setWarning("Discord候補の取得に失敗しました。Discord表示名は手入力してください。");
      }

      const mergedDiscordCandidates = [...remoteDiscordCandidates, ...localDiscordCandidates].filter(
        (candidate, index, array) =>
          array.findIndex((item) => item.id === candidate.id && item.name === candidate.name) === index,
      );
      setDiscordMembers(mergedDiscordCandidates);

      if (mergedDiscordCandidates.length === 0) {
        setWarning("Discord候補が見つからなかったため、Discord表示名は手入力してください。");
      }

      setBooting(false);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loading, router, session?.access_token, session?.user]);

  const gradeDropdownOptions = useMemo(
    () => grades.map((item) => ({ value: String(item.id), label: item.displayGrade })),
    [grades],
  );

  const discordDropdownOptions = useMemo(
    () => discordMembers.map((item) => ({ value: item.name, label: `${item.name} (${item.id})` })),
    [discordMembers],
  );

  const canSubmit = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      form.name.trim().length > 0 &&
      form.gradeId.length > 0 &&
      form.emergency_call.trim().length > 0 &&
      form.student_id.trim().length > 0 &&
      emailPattern.test(form.student_email.trim()) &&
      form.insurance !== "" &&
      form.some_allergy !== "" &&
      form.discord_name.trim().length > 0 &&
      !submitting
    );
  }, [form, submitting]);

  async function onSubmit() {
    if (!session?.access_token || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/memberdb/api/v0/members/me", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        full_name: form.name,
        discord_name: form.discord_name,
        grade: Number(form.gradeId),
        student_id: form.student_id,
        emergency_contact: form.emergency_call,
        student_email: form.student_email,
        insurance: form.insurance === "true",
        some_allergy: form.some_allergy === "true",
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(await parseError(response));
      return;
    }

    await getSupabaseBrowserClient().auth.refreshSession();

    setMessage("登録が完了しました。ダッシュボードへ移動します。");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#bae6fd_0%,#e2e8f0_40%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">入部届画面</h1>
        <p className="mt-2 text-sm text-slate-600">
          必須項目を入力し、MemberDatabaseへの登録を完了してください。
        </p>

        {booting ? <p className="mt-6 text-sm text-slate-700">初期データを読み込み中です...</p> : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {warning ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {warning}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
            {message}
          </p>
        ) : null}

        {!booting ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              氏名
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <SearchableDropdown
              label="学年"
              placeholder="表示学年を選択"
              searchPlaceholder="表示学年で検索"
              options={gradeDropdownOptions}
              value={form.gradeId}
              onChange={(value) => setForm((prev) => ({ ...prev, gradeId: value }))}
            />

            <label className="text-sm text-slate-700">
              緊急連絡先
              <input
                type="text"
                value={form.emergency_call}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, emergency_call: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm text-slate-700">
              学籍番号
              <input
                type="text"
                value={form.student_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, student_id: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              学内メールアドレス
              <input
                type="email"
                value={form.student_email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, student_email: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="text-sm text-slate-700">
              保険加入
              <select
                value={form.insurance}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    insurance: event.target.value as "" | "true" | "false",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">選択してください</option>
                <option value="true">あり</option>
                <option value="false">なし</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              アレルギー
              <select
                value={form.some_allergy}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    some_allergy: event.target.value as "" | "true" | "false",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">選択してください</option>
                <option value="true">あり</option>
                <option value="false">なし</option>
              </select>
            </label>

            <div className="md:col-span-2">
              {discordDropdownOptions.length > 0 ? (
                <SearchableDropdown
                  label="Discord表示名"
                  placeholder="Discord表示名を選択"
                  searchPlaceholder="Discord表示名で検索"
                  options={discordDropdownOptions}
                  value={form.discord_name}
                  onChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      discord_name: value,
                    }));
                  }}
                />
              ) : (
                <label className="text-sm text-slate-700">
                  Discord表示名
                  <input
                    type="text"
                    value={form.discord_name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, discord_name: event.target.value }))
                    }
                    placeholder="Discord表示名を入力"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            登録
          </button>
        </div>
      </div>
    </div>
  );
}
