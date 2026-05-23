import React, { createContext, useContext, useEffect, useState } from "react";
import {
  apiFetch,
  clearSessionCookie,
  getBaseUrl,
  storeSessionCookie,
} from "@/lib/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  franchiseId: number | null;
  franchiseName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await apiFetch("/auth/me");
      if (res.ok) {
        const data = (await res.json()) as AuthUser;
        setUser(data);
      }
    } catch {
      // No session or network error
    } finally {
      setLoading(false);
    }
  }

  async function login(
    email: string,
    password: string
  ): Promise<{ error?: string }> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      if (!res.ok) {
        let errMsg = "Credenciais inválidas";
        try {
          const data = (await res.json()) as {
            error?: string;
            message?: string;
          };
          if (data.error === "pending_approval" && data.message) {
            errMsg = data.message;
          }
        } catch {}
        return { error: errMsg };
      }

      const setCookieHeader =
        res.headers.get("set-cookie") ?? res.headers.get("Set-Cookie");
      await storeSessionCookie(setCookieHeader);

      const data = (await res.json()) as AuthUser;
      setUser(data);
      return {};
    } catch {
      return { error: "Erro de conexão. Verifique sua internet." };
    }
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    await clearSessionCookie();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
