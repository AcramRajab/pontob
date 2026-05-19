import { useAuth } from "@/lib/auth";
import { useLocation, Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return null;

  if (!user) {
    const search = window.location.search;
    const redirect = encodeURIComponent(location + search);
    return <Redirect to={`/login?redirect=${redirect}`} />;
  }

  return <>{children}</>;
}
