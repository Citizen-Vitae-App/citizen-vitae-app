import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requireOnboarding?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  requireOnboarding = true 
}: ProtectedRouteProps) => {
  const { user, isLoading, hasRole, needsOnboarding } = useAuth();
  const { canAccessDashboard, isLoading: orgsLoading } = useUserOrganizations();

  if (isLoading || orgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireOnboarding && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // For "organization" role, also check if user can access dashboard (admin or leader)
  if (requiredRole === 'organization') {
    if (!hasRole('organization') && !canAccessDashboard) {
      return <Navigate to="/" replace />;
    }
  } else if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
