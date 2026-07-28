import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions, type ModuleKey, type Action } from '@/hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  module?: ModuleKey;
  action?: Action;
}

export const ProtectedRoute = ({ children, adminOnly = false, module, action = 'view' }: ProtectedRouteProps) => {
  const { user, profile, loading, canAccessDashboard, isAdmin } = useAuth();
  const { loading: permLoading, can, hasRole } = usePermissions();

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
  if (!profile) return skeleton;
  if (!canAccessDashboard) return <Navigate to="/unauthorized" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/unauthorized" replace />;

  if (module) {
    if (permLoading) return skeleton;
    // super_admin bypass — also allow legacy admin flag while roles backfill
    if (!can(module, action) && !hasRole('super_admin') && !isAdmin) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
