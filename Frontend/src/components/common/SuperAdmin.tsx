import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import { Navigate, Outlet } from "react-router";

const SuperAdmin = () => {
    const user = useSelector((selectCurrentUser));

    if(user && user.isSuperAdmin && !user.tenantId && !user.roleId){
        return <Outlet />
    }else{
        return <Navigate to="/unauthorized" replace />;
    }

  
}

export default SuperAdmin