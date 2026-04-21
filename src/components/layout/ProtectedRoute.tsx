import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
