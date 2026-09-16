import { Navigate, Outlet } from "react-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import Loader from "./Loader";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const loading = useSelector((state: RootState) => state.auth.loading);

  if (loading) {
    return <Loader isLoading={true} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

   if(user?.isSuperAdmin && user.roleId == null){
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