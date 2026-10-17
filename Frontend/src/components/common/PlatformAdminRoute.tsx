import { Navigate, Outlet } from "react-router";
import { Spin } from "antd";
import { useAuthBootstrap } from "../../store/Useauthbootstrap";

export default function PlatformAdminRoute() {
  const { isReady, user } = useAuthBootstrap();
  if (!isReady) return <Spin fullscreen spinning tip="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  return user.isSuperAdmin ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}
