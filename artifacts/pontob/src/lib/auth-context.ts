import { createContext } from "react";

export interface AuthContextType {
  user: import("@workspace/api-client-react").AuthUser | null;
  isLoading: boolean;
  login: (data: import("@workspace/api-client-react").LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
