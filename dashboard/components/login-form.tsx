"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Mode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const { signInPassword, signUpPassword, signInGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const heading = useMemo(() => (mode === "login" ? "ログイン" : "新規登録"), [mode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "login") {
        await signInPassword(email, password);
        router.replace("/dashboard");
      } else {
        await signUpPassword(email, password);
        setMode("login");
        setMessage("Supabase新規登録が完了しました。ログイン後に /members/me の初回登録を行ってください。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${heading}に失敗しました`);
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogleLogin() {
    setSubmitting(true);
    setMessage("");
    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      await signInGoogle(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Googleログインに失敗しました");
      setSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{heading}</h1>
      <p className="mt-1 text-sm text-slate-600">Supabase Auth を通して Dashboard へアクセスします。</p>
      <p className="mt-1 text-xs text-slate-500">※ Dashboard は dbapi 経由で認証し、Supabaseへ直接アクセスしません。</p>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <input
          type="email"
          className="rounded border border-slate-300 px-3 py-2"
          placeholder="email@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          className="rounded border border-slate-300 px-3 py-2"
          placeholder="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-white disabled:bg-slate-500" disabled={submitting}>
          {submitting ? "処理中..." : heading}
        </button>
      </form>

      <button
        type="button"
        className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        onClick={onGoogleLogin}
        disabled={submitting}
      >
        Googleでログイン
      </button>

      <div className="mt-4 text-sm">
        {mode === "login" ? (
          <button type="button" className="text-blue-700 hover:underline" onClick={() => setMode("signup")}>新規登録に切り替える</button>
        ) : (
          <button type="button" className="text-blue-700 hover:underline" onClick={() => setMode("login")}>ログインに切り替える</button>
        )}
      </div>

      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
