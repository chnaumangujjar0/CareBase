import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import { Navigate, Outlet } from "react-router";

const SuperAdmin = () => {
    const user = useSelector((selectCurrentUser));

    if(user && !user.isSuperAdmin && !user.tenantId && !user.roleId){
        return <Outlet />
    } else if (!user) {
        return <Navigate to="/login" replace />;
    } else {
        return <Navigate to={user?.isSuperAdmin ? "/super-admin" : user?.Tenant?.approvalStatus !== "approved" ? "/approval-status" : "/"} replace />;
    }

  
}

export default SuperAdmin
