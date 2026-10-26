import { Navigate, Outlet } from "react-router";
import { Spin } from "antd";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import { getDefaultRoute } from "../../utils/authorization";

const SuperAdmin = () => {
    const { isReady, user } = useAuthBootstrap();

    if (!isReady) return <Spin fullscreen spinning tip="Checking your account..." />;
    if (!user) return <Navigate to="/login" replace />;
    if (user.isSuperAdmin) return <Navigate to="/super-admin" replace />;
    if (!user.tenantId || !user.roleId) return <Outlet />;

    return <Navigate to={getDefaultRoute(user)} replace />;
}

export default SuperAdmin
