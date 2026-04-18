"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, accessToken } = useAuth();

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace("/login");
    }
  }, [loading, accessToken, router]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">認証状態を確認中...</div>;
  }

  if (!accessToken) {
    return null;
  }

  return <>{children}</>;
}
