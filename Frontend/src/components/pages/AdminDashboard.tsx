import HospitalDashboard from "./HospitalDashboard";

interface AdminDashboardProps {
  role: string;
}

export const AdminDashboard = ({ role }: AdminDashboardProps) => (
  <HospitalDashboard role={role} />
);
