import { Navigate, Outlet } from "react-router";
import Loader from "./Loader";
import { useAuthBootstrap } from "../../store/Useauthbootstrap";

interface ProtectedRouteProps {
  allowedRoles?: string[];
 
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute = ({
  allowedRoles,
  skipOnboardingCheck = false,
}: ProtectedRouteProps) => {
  const { isReady, user } = useAuthBootstrap();

  if (!isReady) {
    return <Loader isLoading={true} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!skipOnboardingCheck && user.isSuperAdmin && user.roleId == null) {
    return <Navigate to="/onboarding" replace />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.some(
      (role) => role.toLowerCase() === (user.role ?? "").toLowerCase()
    )
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};