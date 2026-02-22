import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'PENDING') return <Navigate to="/pending" replace />;
  if (user.status === 'SUSPENDED') return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
