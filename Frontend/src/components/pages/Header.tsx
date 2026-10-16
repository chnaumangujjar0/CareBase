import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { selectCurrentUser, clearUser } from "../../store/authSlice";
import { logoutUser } from "../../services/api";
import Logo from "../../assets/carebase-logo-full.svg";
import "../../styles/header.scss"; 

export const Header = () => {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      dispatch(clearUser());
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("carbase-user");
      navigate("/login", { replace: true });
    }
  };

  // Define the dropdown menu items
  const dropdownItems: MenuProps['items'] = [
    {
      key: 'logout',
      danger: true, // Automatically applies red text on hover for destructive actions
      icon: <LogOut size={16} />,
      label: 'Log Out',
      onClick: handleLogout,
    },
  ];

  return (
    <header className="top-header">
        <div className="header-brand">
          <img src={Logo} alt="CareBase Logo" className="header-logo" />
        </div>

        <div className="header-actions">
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={20} strokeWidth={2} />
            <span className="notification-dot"></span>
          </button>

          <div className="header-divider"></div>

          {/* AntD Dropdown wrapping the user profile badge */}
          <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
            <div className="header-user-profile" style={{ cursor: "pointer" }}>
              <div className="user-text">
                <span className="user-name">{user?.name || "Staff Member"}</span>
                <span className="user-role">{user?.role || "System Administrator"}</span>
              </div>
              
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=E2E8F0&color=0F766E`} 
                alt="User Avatar" 
                className="header-avatar" 
              />
              
              <ChevronDown size={16} className="dropdown-icon" />
            </div>
          </Dropdown>
        </div>
    </header>
  );
};