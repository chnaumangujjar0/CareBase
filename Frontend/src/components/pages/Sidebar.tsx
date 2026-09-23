import { NavLink, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
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
} from "lucide-react";
import "../../styles/sidebar.scss";
import { clearUser } from "../../store/authSlice";
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
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Analytics", path: "/analytics", icon: BarChart2 },
      { label: "Appointments", path: "/appointments", icon: Calendar },
      { label: "Patients", path: "/patient", icon: Users },
      { label: "Doctors", path: "/doctors", icon: Stethoscope },
      { label: "Departments", path: "/departments", icon: Building },
      { label: "Beds", path: "/beds", icon: Bed },
      { label: "Reports", path: "/reports", icon: FileText },
    ],
  },
  {
    title: "Care & Services",
    items: [
      { label: "Emergency", path: "/emergency", icon: Activity },
      { label: "Lab", path: "/lab", icon: FlaskConical },
      { label: "Pharmacy", path: "/pharmacy", icon: Pill },
      { label: "Billing", path: "/billing", icon: Receipt },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Staff Management", path: "/staff", icon: UsersRound },
      { label: "Integrations", path: "/integrations", icon: Link2 },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export const Sidebar = () => {
  const { isReady, tenant } = useTenantBootstrap();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isloading, setIsloading] = useState(false);

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

              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) => (isActive ? "link active" : "link")}
                >
                  <item.icon className="linkIcon" size={20} />
                  <span className="linkLabel">{item.label}</span>
                </NavLink>
              ))}
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