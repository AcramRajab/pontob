import React from "react";
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import type { LoginInput } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
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
    queryClient.setQueryData(getGetMeQueryKey(), undefined);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isUserLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
