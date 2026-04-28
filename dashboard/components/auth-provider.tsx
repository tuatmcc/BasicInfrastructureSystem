"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  roles: string[];
};

type SessionRoleResponse = {
  code: number;
  body?: {
    user_id: string;
    email: string | null;
    roles: string[];
    is_admin: boolean;
  };
  message?: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    let active = true;

    async function syncSession(currentSession: Session | null) {
      setSession(currentSession);

      if (!currentSession?.access_token) {
        if (active) {
          setRoles([]);
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const response = await fetch("/api/auth/session", {
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          cache: "no-store",
        });

        if (!active) {
          return;
        }

        if (!response.ok) {
          setRoles([]);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const json = (await response.json()) as SessionRoleResponse;
        setRoles(json.body?.roles ?? []);
        setIsAdmin(json.body?.is_admin === true);
      } catch {
        if (active) {
          setRoles([]);
          setIsAdmin(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      void syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      void syncSession(currentSession ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isAdmin,
      roles,
    }),
    [isAdmin, loading, roles, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
