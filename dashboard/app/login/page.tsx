"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, loading, applyOAuthHash } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
      applyOAuthHash(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [applyOAuthHash]);

  useEffect(() => {
    if (!loading && accessToken) {
      router.replace("/dashboard");
    }
  }, [accessToken, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <LoginForm />
    </main>
  );
}
