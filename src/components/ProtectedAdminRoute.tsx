import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-charcoal/60">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
