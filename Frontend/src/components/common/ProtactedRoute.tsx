import { Navigate, Outlet } from "react-router";
import { Spin } from "antd";
import { useAuthBootstrap } from "../../store/Useauthbootstrap";
import { hasAnyPermission, hasRole } from "../../utils/authorization";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  allowedPermissions?: string[];
 
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute = ({
  allowedRoles,
  allowedPermissions,
  skipOnboardingCheck = false,
}: ProtectedRouteProps) => {
  const { isReady, user } = useAuthBootstrap();

  if (!isReady) {
    return <Spin fullscreen spinning tip="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!skipOnboardingCheck && user.isSuperAdmin && user.roleId == null) {
    return <Navigate to="/onboarding" replace />;
  }

  if (
    ((allowedRoles?.length && !hasRole(user, allowedRoles)) ||
      (allowedPermissions?.length && !hasAnyPermission(user, allowedPermissions)))
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};