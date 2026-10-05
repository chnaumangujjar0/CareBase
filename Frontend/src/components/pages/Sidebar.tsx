import { NavLink, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  BarChart2,
  Calendar,
  Users,
  Stethoscope,
  Building,
  Bed,
  FileText,
  Activity,
  FlaskConical,
  Pill,
  Receipt,
  UsersRound,
  Link2,
  Settings,
  LogOut,
  Lock,
} from "lucide-react";
import "../../styles/sidebar.scss";
import { clearUser, selectCurrentUser } from "../../store/authSlice";
import Logo from "../../../public/carebase-logo-icon.svg";
import { logoutUser } from "../../services/api";
import { useState } from "react";
import Loader from "../common/Loader";
import { toast } from "react-toastify";
import { clearTenant } from "../../store/tenantSlice";
import { useTenantBootstrap } from "../../store/Usetenantbootstrap";

const navConfig = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["Owner", "Admin"] },
      { label: "Analytics", path: "/analytics", icon: BarChart2, roles: ["Owner", "Admin"] },
      { label: "Appointments", path: "/appointments", icon: Calendar, roles: ["Owner", "Admin", "Receptionist"] },
      { label: "Patients", path: "/patient", icon: Users, roles: ["Owner", "Admin", "Receptionist", "Nurse"] },
      { label: "Doctors", path: "/doctors", icon: Stethoscope, roles: ["Owner", "Doctor"] },
      { label: "Departments", path: "/departments", icon: Building, roles: ["Owner", "Admin"] },
      { label: "Beds", path: "/beds", icon: Bed, roles: ["Owner", "Admin"] },
      { label: "Reports", path: "/reports", icon: FileText, roles: ["Owner", "Admin"] },
    ],
  },
  {
    title: "Care & Services",
    items: [
      { label: "Emergency", path: "/emergency", icon: Activity, roles: ["Owner", "Admin"] },
      { label: "Lab", path: "/lab", icon: FlaskConical, roles: ["Owner", "Admin", "Lab Technician"] },
      { label: "Pharmacy", path: "/pharmacy", icon: Pill, roles: ["Owner", "Admin", "Pharmacist"] },
      { label: "Billing", path: "/billing", icon: Receipt, roles: ["Owner", "Admin", "Billing Specialist"] },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Staff Management", path: "/staff", icon: UsersRound, roles: ["Owner", "Admin"] },
      { label: "Integrations", path: "/integrations", icon: Link2, roles: ["Owner", "Admin"] },
      { label: "Settings", path: "/settings", icon: Settings, roles: ["Owner", "Admin"] },
    ],
  },
];

export const Sidebar = () => {
  const { isReady, tenant } = useTenantBootstrap();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isloading, setIsloading] = useState(false);
  const user = useSelector(selectCurrentUser)

  const handleLogout = async () => {
    setIsloading(true);
    try {
      await logoutUser();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      console.error("Server-side logout failed, proceeding with local cleanup:", error);
    } finally {
      dispatch(clearUser());
      dispatch(clearTenant());
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("carbase-user");

      setIsloading(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <Loader isLoading={isloading || !isReady} />
      <aside className="sidebar">
        <div className="header">
          <img
            src={tenant?.logo ?? Logo}
            alt={tenant?.name ? `${tenant.name} logo` : "Hospital logo"}
            className="brandLogo"
          />
          <span className="brandText">{tenant?.name?.toLocaleUpperCase()}</span>
        </div>

        {/* Navigation Links */}
        <nav className="navScroll">
          {navConfig.map((section, index) => (
            <div key={section.title} className="section">
              {/* The title fades in on hover */}
              <div className="sectionTitle">{section.title}</div>

              {section.items.map((item) => {
                const isAllowed = user?.role != null && item.roles.some((role) => role === user.role);
                const contents = (
                  <>
                    <item.icon className="linkIcon" size={20} />
                    <span className="linkLabel">{item.label}</span>
                    {!isAllowed && <Lock className="linkLock" size={16} aria-hidden="true" />}
                  </>
                );

                return isAllowed ? (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    className={({ isActive }) => (isActive ? "link active" : "link")}
                  >
                    {contents}
                  </NavLink>
                ) : (
                  <div
                    key={item.label}
                    className="link disabled"
                    role="link"
                    aria-disabled="true"
                    title={`${item.label} is unavailable for your role`}
                  >
                    {contents}
                  </div>
                );
              })}
              {index < navConfig.length - 1 && <div className="divider" />}
            </div>
          ))}
        </nav>
        <div className="logoutWrapper">
          <div className="divider" />
          <button className="link logoutBtn" onClick={handleLogout}>
            <LogOut className="linkIcon" size={20} />
            <span className="linkLabel">Log Out</span>
          </button>
        </div>
        <div className="divider" />
      </aside>
    </>
  );
};