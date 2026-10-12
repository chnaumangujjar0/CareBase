import { Navigate } from "react-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { DoctorDashboard } from "./DoctorDashboard";
import HospitalDashboard from "./HospitalDashboard";

const Dashboard = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user?.isSuperAdmin && user.roleId == null) {
    return <Navigate to="/onboarding" replace />;
  }
  if (user?.role?.toLowerCase() === "doctor") {
    return <DoctorDashboard />;
  }
  return <HospitalDashboard role={user?.role ?? "Staff"} />;
};

export default Dashboard;
