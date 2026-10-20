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
  Hospital,
  ClipboardList,
  ReceiptText,
  BriefcaseBusiness,
} from "lucide-react";
import "../../styles/sidebar.scss";
import { clearUser, selectCurrentUser } from "../../store/authSlice";
import Logo from "../../../public/carebase-logo-icon.svg";
import { logoutUser } from "../../services/api";
import { useState } from "react";
import { Skeleton } from "antd";
import { toast } from "react-toastify";
import { clearTenant } from "../../store/tenantSlice";
import { useTenantBootstrap } from "../../store/Usetenantbootstrap";
import { hasPermission, hasRole } from "../../utils/authorization";

const navConfig = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
      { label: "Appointments", path: "/appointments", icon: Calendar, permission: "appointments:read" },
      { label: "Clinical Desk", path: "/clinical", icon: Stethoscope, permission: "clinical:encounters:read" },
      { label: "Clinical Operations", path: "/clinical/operations", icon: Activity, permission: "clinical:admissions:read" },
      { label: "Patients", path: "/patient", icon: Users, permission: "patients:read" },
    ],
  },
  {
    title: "Care & Services",
    items: [
      { label: "Pharmacy", path: "/pharmacy", icon: Pill, permission: "clinical:medicines:read" },
      { label: "Billing", path: "/billing", icon: ReceiptText, permissions: ["billing:invoices:read", "billing:rates:read"] },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Staff Management", path: "/staff", icon: UsersRound, roles: ["Owner", "Admin"] },
      { label: "HR Dashboard", path: "/hr", icon: BriefcaseBusiness, permission: "hr:dashboard:read" },
      { label: "Audit Logs", path: "/audit-logs", icon: ClipboardList, roles: ["Owner", "Admin"] },
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

  const isSettingsAllowed = hasRole(user, ["Owner", "Admin"]);
  const isFacilityAllowed = hasRole(user, ["Owner", "Admin"]);
  const isSettingsActive = location.pathname.startsWith("/settings");
  const isFacilityActive = location.pathname.startsWith("/facility");

  return (
    <>
      {(isloading || !isReady) && <div
        aria-busy="true"
        aria-label={isloading ? "Signing out" : "Loading hospital workspace"}
        style={{ position: "fixed", inset: 0, zIndex: 2000, display: "grid", placeItems: "center", padding: 24, background: "rgba(241, 245, 249, 0.86)" }}
      >
        <div style={{ width: "min(100%, 520px)", padding: 24, borderRadius: 12, background: "#fff", boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)" }}>
          <Skeleton active title={{ width: "42%" }} paragraph={{ rows: 5 }} />
        </div>
      </div>}
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
                const isAllowed = "permissions" in item
                  ? item.permissions?.some((permission) => hasPermission(user, permission)) ?? false
                  : "permission" in item
                    ? hasPermission(user, item.permission ?? "")
                  : hasRole(user, item.roles);
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
    </>
  );
};
