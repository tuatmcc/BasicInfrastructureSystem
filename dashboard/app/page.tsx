"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type OAuthOption = {
  provider: Provider;
  label: string;
};

const oauthOptions: OAuthOption[] = [
  { provider: "google", label: "Google" },
  { provider: "github", label: "GitHub" },
  { provider: "discord", label: "Discord" },
];

function toAuthErrorMessage(error: { message: string } | null): string {
  if (!error) {
    return "認証に失敗しました。";
  }

  if (error.message.includes("Unsupported provider") || error.message.includes("provider is not enabled")) {
    return "このOAuthプロバイダはSupabaseで未有効化です。Supabase Dashboard > Authentication > Providers で有効化し、Callback URL を設定してください。";
  }

  return error.message;
}

export default function AuthEntryPage() {
  const router = useRouter();
  const { session } = useAuth();
  const registrationRequired =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("registration") === "required";

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [registering, setRegistering] = useState(false);

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
      setAuthError(toAuthErrorMessage(error));
    }
  }

  async function onPasswordRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistering(true);
    setAuthError("");
    setAuthMessage("");

    const supabase = getSupabaseBrowserClient();
    const signUpResult = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/enrollment`,
      },
    });

    if (signUpResult.error) {
      setRegistering(false);
      setAuthError(signUpResult.error.message);
      return;
    }

    const immediateToken = signUpResult.data.session?.access_token;

    if (immediateToken) {
      setRegistering(false);
      router.push("/enrollment");
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email: signupEmail,
      password: signupPassword,
    });

    setRegistering(false);

    if (signInResult.error || !signInResult.data.session?.access_token) {
      setAuthMessage(
        "Authへの登録は完了しました。確認メールのリンクから入部届画面へ進んでください。",
      );
      return;
    }

    router.push("/enrollment");
  }

  async function onOAuthRegister(provider: Provider) {
    setRegistering(true);
    setAuthError("");
    setAuthMessage("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/enrollment`,
      },
    });

    setRegistering(false);

    if (error) {
      setAuthError(toAuthErrorMessage(error));
    }
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
            {registrationRequired ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                ダッシュボードを利用するには、先に入部届の登録を完了してください。
              </p>
            ) : null}
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
              <div className="space-y-6">
                <p className="text-sm text-slate-600">
                  まず登録手段を選択してください。登録完了後、入部届画面へ遷移します。
                </p>

                <form className="space-y-3" onSubmit={onPasswordRegister}>
                  <h2 className="text-sm font-semibold text-slate-700">Email + PWで登録</h2>
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
                    登録
                  </button>
                </form>

                <div>
                  <h2 className="mb-2 text-sm font-semibold text-slate-700">OAuthで登録</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {oauthOptions.map((item) => (
                      <button
                        key={item.provider}
                        type="button"
                        disabled={registering}
                        onClick={() => void onOAuthRegister(item.provider)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        登録 ({item.label})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
