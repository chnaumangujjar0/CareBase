import { Navigate, Outlet } from "react-router";
import { Spin } from "antd";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import { hasAnyPermission, hasPermission, hasRole } from "../../utils/authorization";

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

  if (!skipOnboardingCheck && user.isSuperAdmin && !user.tenantId) {
    return <Navigate to="/super-admin" replace />;
  }

  if (!skipOnboardingCheck && (!user.tenantId || !user.roleId)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!skipOnboardingCheck && user.Tenant?.approvalStatus && user.Tenant.approvalStatus !== "approved") {
    return <Navigate to="/approval-status" replace />;
  }

  if (
    ((allowedRoles?.length && !hasRole(user, allowedRoles)) ||
      (allowedPermissions?.length && !hasAnyPermission(user, allowedPermissions)))
  ) {
    return <Navigate to={hasPermission(user, "hr:dashboard:read") ? "/hr" : "/unauthorized"} replace />;
  }

  return <Outlet />;
};
