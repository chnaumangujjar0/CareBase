import { Navigate } from "react-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { AdminDashboard } from "./AdminDashboard";
import { DoctorDashboard } from "./DoctorDashboard";
import { ReceptionistDashboard } from "./ReceptionistDashboard";
import HospitalDashboard from "./HospitalDashboard";

const Dashboard = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user?.isSuperAdmin && user.roleId == null) {
    return <Navigate to="/super-admin" replace />;
  }
  const role = user?.role?.trim().toLowerCase();

  switch (role) {
    case "doctor":
      return <DoctorDashboard />;
    case "receptionist":
      return <ReceptionistDashboard />;
    case "owner":
    case "admin":
      return <AdminDashboard role={user?.role ?? role} />;
    default:
      return <HospitalDashboard role={user?.role ?? "Staff"} />;
  }
};

export default Dashboard;
