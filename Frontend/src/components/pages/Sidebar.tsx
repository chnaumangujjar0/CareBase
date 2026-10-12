import { NavLink, useNavigate, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  Building,
  Activity,
  Pill,
  UsersRound,
  Settings,
  LogOut,
  Lock,
  ChevronDown,
  ChevronUp,
  Shield,
  Building2,
  Hospital
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
import { ConfigProvider } from "antd";

const navConfig = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["Owner", "Admin", "Doctor", "Receptionist", "Nurse"] },
      { label: "Appointments", path: "/appointments", icon: Calendar, roles: ["Owner", "Admin", "Doctor", "Receptionist"] },
      { label: "Clinical Desk", path: "/clinical", icon: Stethoscope, roles: ["Owner", "Admin", "Doctor", "Receptionist", "Nurse"] },
      { label: "Clinical Operations", path: "/clinical/operations", icon: Activity, roles: ["Owner", "Admin", "Doctor", "Nurse"] },
      { label: "Patients", path: "/patient", icon: Users, roles: ["Owner", "Admin", "Receptionist", "Nurse"] },
    ],
  },
  {
    title: "Care & Services",
    items: [
      { label: "Medicine catalogue", path: "/clinical/operations", icon: Pill, roles: ["Owner", "Admin", "Doctor", "Nurse"] },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Staff Management", path: "/staff", icon: UsersRound, roles: ["Owner", "Admin"] },
    ],
  },
];

// Sub-items for the Settings dropdown matching your design reference
const settingsSubItems = [
  { label: "Hospital Profile", path: "/settings/profile", icon: Building2 },
  { label: "Departments", path: "/settings/departments", icon: Building },
  { label: "User Roles", path: "/settings/roles", icon: Shield },
];
const facilitySubItems = [
  { label: "Wards", path: "/facility/wards" },
  { label: "Rooms", path: "/facility/rooms" },
  { label: "Beds", path: "/facility/beds" },
]

export const Sidebar = () => {
  const { isReady, tenant } = useTenantBootstrap();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isloading, setIsloading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    location.pathname.startsWith("/settings")
  );
  const [isFacilityOpen, setIsFacilityOpen] = useState(
    location.pathname.startsWith("/facility")
  );
  const user = useSelector(selectCurrentUser);

  

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

  const roleName = user?.role?.toLowerCase();
  const isSettingsAllowed = roleName != null && ["owner", "admin"].includes(roleName);
  const isFacilityAllowed = roleName != null && ["owner", "admin"].includes(roleName);
  const isSettingsActive = location.pathname.startsWith("/settings");
  const isFacilityActive = location.pathname.startsWith("/facility");

  // Ant Design Theme matching your exact enterprise variables
  const themeConfig = {
    token: {
      colorPrimary: '#0F766E', // Deep Teal
      colorTextBase: '#475569', // Slate gray-blue
      fontFamily: '"Inter", sans-serif',
      borderRadius: 8,
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
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
              <div className="sectionTitle">{section.title}</div>

              {section.items.map((item) => {
                const isAllowed = roleName != null && item.roles.some((role) => role.toLowerCase() === roleName);
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

          <div className="section">
            <div className="sectionTitle">Facility Management</div>
            
            {/* Check if user is allowed first, NOT if it is open */}
            {isFacilityAllowed ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* The clickable toggle button */}
                <div
                  className={`link ${isFacilityActive && !isFacilityOpen ? "active" : ""}`}
                  onClick={() => setIsFacilityOpen(!isFacilityOpen)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Hospital className="linkIcon" size={20} />
                    <span className="linkLabel">Facility Management</span>
                  </div>
                  {isFacilityOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

              {/* The dropdown contents (Only show if isFacilityOpen is true) */}
              {isFacilityOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '24px', position: 'relative', marginTop: '4px', gap: '2px' }}>
                  <div style={{ position: 'absolute', left: '20px', top: '0', bottom: '8px', width: '2px', backgroundColor: '#E2E8F0' }} />
                  {facilitySubItems.map((subItem) => {
                    const isSubActive = location.pathname === subItem.path;
                    return (
                      <NavLink
                        key={subItem.label}
                        to={subItem.path}
                        className="link sub-link"
                        style={{
                          fontSize: '0.875rem',
                          padding: '8px 12px',
                          borderRadius: isSubActive ? '8px' : '6px',
                          backgroundColor: isSubActive ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                          color: isSubActive ? '#0F766E' : '#475569',
                          fontWeight: isSubActive ? 600 : 400,
                          borderLeft: isSubActive ? '3px solid #0F766E' : '3px solid transparent'
                        }}
                      >
                        <span className="linkLabel">{subItem.label}</span>
                      </NavLink>
                    );
                      })}
                    </div>
                  )}
              </div>
              ) : (
                <>
                  {/* The locked state for unauthorized roles */}
                  <div className="link disabled" role="link" aria-disabled="true" title="Facility management unavailable for your role">
                    <Hospital className="linkIcon" size={20} />
                    <span className="linkLabel">Facility Management</span>
                    <Lock className="linkLock" size={16} aria-hidden="true" />
                  </div>
                </>
              )}
            </div>

          {/* System Settings Dropdown matching your reference image */}
          <div className="section">
            <div className="sectionTitle">System Settings</div>
            {isSettingsAllowed ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  className={`link ${isSettingsActive && !isSettingsOpen ? "active" : ""}`}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Settings className="linkIcon" size={20} />
                    <span className="linkLabel">System Settings</span>
                  </div>
                  {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {/* Dropdown Submenu */}
                {isSettingsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '24px', position: 'relative', marginTop: '4px', gap: '2px' }}>
                    {/* Vertical guideline indicator matching the image */}
                    <div style={{ position: 'absolute', left: '20px', top: '0', bottom: '8px', width: '2px', backgroundColor: '#E2E8F0' }} />
                    
                    {settingsSubItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <NavLink
                          key={subItem.label}
                          to={subItem.path}
                          className="link sub-link"
                          style={{
                            fontSize: '0.875rem',
                            padding: '8px 12px',
                            borderRadius: isSubActive ? '8px' : '6px',
                            backgroundColor: isSubActive ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                            color: isSubActive ? '#0F766E' : '#475569',
                            fontWeight: isSubActive ? 600 : 400,
                            borderLeft: isSubActive ? '3px solid #0F766E' : '3px solid transparent'
                          }}
                        >
                          <span className="linkLabel">{subItem.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="link disabled" role="link" aria-disabled="true" title="Settings unavailable for your role">
                <Settings className="linkIcon" size={20} />
                <span className="linkLabel">System Settings</span>
                <Lock className="linkLock" size={16} aria-hidden="true" />
              </div>
            )}
          </div>
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
    </ConfigProvider>
  );
};