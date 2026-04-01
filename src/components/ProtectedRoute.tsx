import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, profile, loading, canAccessDashboard, isAdmin } = useAuth();

  const skeleton = (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-4 w-64">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );

  if (loading) return skeleton;

  if (!user) return <Navigate to="/login" replace />;

  // User is authenticated but profile hasn't loaded yet — wait rather than
  // flashing /unauthorized because canAccessDashboard reads from profile.
  if (!profile) return skeleton;
  if (!canAccessDashboard) return <Navigate to="/unauthorized" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
};
