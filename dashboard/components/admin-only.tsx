"use client";

import { useAuth } from "@/components/auth-provider";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return <p className="text-sm text-slate-600">権限を確認しています...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        このページは管理者のみ利用できます。
      </div>
    );
  }

  return <>{children}</>;
}
