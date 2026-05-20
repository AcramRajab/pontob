import React from "react";
import { useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import type { LoginInput, AuthUser } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Custom queryFn: returns null on 401 instead of throwing so TanStack Query
  // clears `data` (rather than keeping stale cache), which lets ProtectedRoute
  // detect the expired session and redirect to /login.
  const { data: user, isLoading: isUserLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json() as Promise<AuthUser>;
    },
    retry: false,
    staleTime: 0,
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (data: LoginInput) => {
    await loginMutation.mutateAsync({ data });
    await refetch();
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Session may already be gone — proceed with client-side cleanup
    }
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isUserLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
