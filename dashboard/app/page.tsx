"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type DiscordMember = {
  id: string;
  name: string;
};

type RegisterForm = {
  name: string;
  grade: string;
  emergency_call: string;
  student_id: string;
  student_email: string;
  insurance: "true" | "false";
  some_allergy: "true" | "false";
  discord_id: string;
  discord_name: string;
};

type OAuthOption = {
  provider: Provider;
  label: string;
};

const oauthOptions: OAuthOption[] = [
  { provider: "google", label: "Google" },
  { provider: "github", label: "GitHub" },
  { provider: "discord", label: "Discord" },
  { provider: "gitlab", label: "GitLab" },
  { provider: "bitbucket", label: "Bitbucket" },
  { provider: "azure", label: "Microsoft Azure" },
  { provider: "twitter", label: "X (Twitter)" },
  { provider: "notion", label: "Notion" },
];

const initialRegisterForm: RegisterForm = {
  name: "",
  grade: "1",
  emergency_call: "",
  student_id: "",
  student_email: "",
  insurance: "false",
  some_allergy: "false",
  discord_id: "",
  discord_name: "",
};

async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export default function AuthEntryPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupReady, setSignupReady] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([]);
  const [discordSearch, setDiscordSearch] = useState("");

  const filteredDiscordMembers = useMemo(() => {
    const keyword = discordSearch.trim().toLowerCase();
    if (!keyword) {
      return discordMembers;
    }
    return discordMembers.filter((member) =>
      member.name.toLowerCase().includes(keyword),
    );
  }, [discordMembers, discordSearch]);

  async function fetchDiscordMembers(accessToken: string) {
    const response = await fetch("/api/discord/api/v0/member/list", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = (await response.json()) as DiscordMember[];
    setDiscordMembers(data);
    if (data.length > 0) {
      setRegisterForm((prev) => ({
        ...prev,
        discord_id: data[0].id,
        discord_name: data[0].name,
      }));
    }
  }

  async function onPasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    setAuthMessage("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setLoggingIn(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function onMagicLinkLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    setAuthMessage("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoggingIn(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAuthMessage("Magic Linkを送信しました。メールを確認してください。");
  }

  async function onOAuthLogin(provider: Provider) {
    setAuthError("");
    setAuthMessage("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  }

  async function onPrepareSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistering(true);
    setAuthError("");
    setAuthMessage("");

    const supabase = getSupabaseBrowserClient();

    const signUpResult = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
    });

    if (signUpResult.error) {
      setRegistering(false);
      setAuthError(signUpResult.error.message);
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email: signupEmail,
      password: signupPassword,
    });

    if (signInResult.error || !signInResult.data.session?.access_token) {
      setRegistering(false);
      setAuthMessage(
        "アカウントを作成しました。メール認証が必要な設定のため、認証後にログインして登録を完了してください。",
      );
      return;
    }

    try {
      await fetchDiscordMembers(signInResult.data.session.access_token);
      setSignupReady(true);
      setAuthMessage("Discordユーザー一覧を取得しました。登録情報を入力して完了してください。");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Discordユーザー一覧の取得に失敗しました。");
    } finally {
      setRegistering(false);
    }
  }

  async function onCompleteRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.access_token) {
      setAuthError("先にアカウント作成ステップを完了してください。");
      return;
    }

    if (!registerForm.discord_name) {
      setAuthError("Discord表示名を選択してください。");
      return;
    }

    setRegistering(true);
    setAuthError("");
    setAuthMessage("");

    const response = await fetch("/api/memberdb/api/v0/me", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        full_name: registerForm.name,
        discord_name: registerForm.discord_name,
        grade: Number(registerForm.grade),
        student_id: registerForm.student_id,
        emergency_contact: registerForm.emergency_call,
        student_email: registerForm.student_email,
        insurance: registerForm.insurance === "true",
        some_allergy: registerForm.some_allergy === "true",
      }),
    });

    setRegistering(false);

    if (!response.ok) {
      setAuthError(await parseApiError(response));
      return;
    }

    setAuthMessage("登録が完了しました。ダッシュボードへ移動します。");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#a5f3fc_0%,#e2e8f0_45%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">MCC基盤システム</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
              Dashboard ログイン / 新規登録
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              ログイン後は、MemberDatabase と DiscordConnector の既存APIを経由して
              部員情報管理とDiscord管理を行えます。
            </p>
            {session ? (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-6 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800"
              >
                ダッシュボードへ移動
              </button>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
            <div className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={
                  activeTab === "login"
                    ? "flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-cyan-700 shadow"
                    : "flex-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
                }
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={
                  activeTab === "signup"
                    ? "flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-cyan-700 shadow"
                    : "flex-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
                }
              >
                新規登録
              </button>
            </div>

            {authError ? (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {authError}
              </p>
            ) : null}
            {authMessage ? (
              <p className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
                {authMessage}
              </p>
            ) : null}

            {activeTab === "login" ? (
              <div className="space-y-6">
                <form className="space-y-3" onSubmit={onPasswordLogin}>
                  <h2 className="text-sm font-semibold text-slate-700">メールアドレス + パスワード</h2>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                  >
                    ログイン
                  </button>
                </form>

                <form className="space-y-3" onSubmit={onMagicLinkLogin}>
                  <h2 className="text-sm font-semibold text-slate-700">Magic Link</h2>
                  <input
                    type="email"
                    required
                    value={magicEmail}
                    onChange={(event) => setMagicEmail(event.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                  >
                    Magic Linkを送信
                  </button>
                </form>

                <div>
                  <h2 className="mb-2 text-sm font-semibold text-slate-700">OAuthログイン</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {oauthOptions.map((item) => (
                      <button
                        key={item.provider}
                        type="button"
                        onClick={() => void onOAuthLogin(item.provider)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form className="space-y-3" onSubmit={onPrepareSignup}>
                  <h2 className="text-sm font-semibold text-slate-700">1. Supabaseアカウント作成</h2>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="8文字以上のパスワード"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                  >
                    アカウント作成してDiscord候補を取得
                  </button>
                </form>

                <form className="space-y-3" onSubmit={onCompleteRegistration}>
                  <h2 className="text-sm font-semibold text-slate-700">2. 部員情報登録</h2>
                  <input
                    type="text"
                    required
                    disabled={!signupReady}
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="氏名"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                  <input
                    type="number"
                    min={1}
                    required
                    disabled={!signupReady}
                    value={registerForm.grade}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, grade: event.target.value }))
                    }
                    placeholder="学年(数値)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    required
                    disabled={!signupReady}
                    value={registerForm.emergency_call}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, emergency_call: event.target.value }))
                    }
                    placeholder="緊急連絡先"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    required
                    disabled={!signupReady}
                    value={registerForm.student_id}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, student_id: event.target.value }))
                    }
                    placeholder="学籍番号"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                  <input
                    type="email"
                    required
                    disabled={!signupReady}
                    value={registerForm.student_email}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, student_email: event.target.value }))
                    }
                    placeholder="学内メールアドレス"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      disabled={!signupReady}
                      value={registerForm.insurance}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          insurance: event.target.value as "true" | "false",
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="true">保険加入: あり</option>
                      <option value="false">保険加入: なし</option>
                    </select>
                    <select
                      disabled={!signupReady}
                      value={registerForm.some_allergy}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          some_allergy: event.target.value as "true" | "false",
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="true">アレルギー: あり</option>
                      <option value="false">アレルギー: なし</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    disabled={!signupReady}
                    value={discordSearch}
                    onChange={(event) => setDiscordSearch(event.target.value)}
                    placeholder="Discord表示名で検索"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                  <select
                    required
                    disabled={!signupReady}
                    value={registerForm.discord_id}
                    onChange={(event) => {
                      const selected = discordMembers.find((member) => member.id === event.target.value);
                      setRegisterForm((prev) => ({
                        ...prev,
                        discord_id: event.target.value,
                        discord_name: selected?.name ?? "",
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {filteredDiscordMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.id})
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={!signupReady || registering}
                    className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    新規登録を完了
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
