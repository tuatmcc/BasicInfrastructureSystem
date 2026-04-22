"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

type DiscordMember = {
  id: string;
  name: string;
};

type GradeOption = {
  id: number;
  displayGrade: string;
};

type EnrollmentForm = {
  name: string;
  gradeId: string;
  emergency_call: string;
  student_id: string;
  student_email: string;
  insurance: "" | "true" | "false";
  some_allergy: "" | "true" | "false";
  discord_id: string;
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
  discord_id: "",
  discord_name: "",
};

type SearchableDropdownProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function SearchableDropdown({
  label,
  placeholder,
  searchPlaceholder,
  options,
  value,
  disabled,
  onChange,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((item) => item.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return options;
    }
    return options.filter((item) => item.label.toLowerCase().includes(keyword));
  }, [options, query]);

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm disabled:bg-slate-100"
        >
          {selected?.label ?? placeholder}
        </button>
        {open ? (
          <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 shadow-lg">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <div className="max-h-52 overflow-auto rounded-md border border-slate-200">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">候補がありません</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
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

      const meResponse = await fetch("/api/memberdb/api/v0/members/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!active) {
        return;
      }

      if (meResponse.ok) {
        router.replace("/dashboard");
        return;
      }

      if (meResponse.status !== 401 && meResponse.status !== 404) {
        setError(`登録状態の確認に失敗しました: ${await parseError(meResponse)}`);
        setBooting(false);
        return;
      }

      const [gradesResponse, discordResponse] = await Promise.all([
        fetch("/api/memberdb/api/v0/grades", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/discord/api/v0/member/list", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!active) {
        return;
      }

      if (!gradesResponse.ok) {
        setError(`学年一覧の取得に失敗しました: ${await parseError(gradesResponse)}`);
        setBooting(false);
        return;
      }

      if (!discordResponse.ok) {
        setError(`Discord候補の取得に失敗しました: ${await parseError(discordResponse)}`);
        setBooting(false);
        return;
      }

      const gradesJson = (await gradesResponse.json()) as {
        code: number;
        body: Record<string, string>;
      };
      const discordJson = (await discordResponse.json()) as DiscordMember[];

      const gradeOptions = Object.entries(gradesJson.body)
        .map(([id, displayGrade]) => ({ id: Number(id), displayGrade }))
        .filter((item) => !Number.isNaN(item.id))
        .sort((a, b) => a.id - b.id);

      setGrades(gradeOptions);
      setDiscordMembers(discordJson);
      setBooting(false);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loading, router, session?.access_token]);

  const gradeDropdownOptions = useMemo(
    () => grades.map((item) => ({ value: String(item.id), label: item.displayGrade })),
    [grades],
  );

  const discordDropdownOptions = useMemo(
    () => discordMembers.map((item) => ({ value: item.id, label: `${item.name} (${item.id})` })),
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
      form.discord_id.length > 0 &&
      form.discord_name.length > 0 &&
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
              <SearchableDropdown
                label="Discord表示名"
                placeholder="Discord表示名を選択"
                searchPlaceholder="Discord表示名で検索"
                options={discordDropdownOptions}
                value={form.discord_id}
                onChange={(value) => {
                  const selected = discordMembers.find((item) => item.id === value);
                  setForm((prev) => ({
                    ...prev,
                    discord_id: value,
                    discord_name: selected?.name ?? "",
                  }));
                }}
              />
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
