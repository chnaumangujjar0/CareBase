import { useSelector } from "react-redux";
import { Bell, ChevronDown } from "lucide-react";
import { selectCurrentUser } from "../../store/authSlice";
import Logo from "../../assets/carebase-logo-full.svg";
import "../../styles/header.scss"; 
import { useEffect } from "react";

export const Header = () => {

  const user = useSelector(selectCurrentUser);
  console.log(user?.name);
  return (
    <header className="top-header">
      {/* Left Side: Brand Identity */}
      <div className="header-brand">
        <img src={Logo} alt="CareBase Logo" className="header-logo" />
      </div>

      {/* Right Side: Actions & User Profile */}
      <div className="header-actions">
        {/* Notification Bell */}
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={20} strokeWidth={2} />
          <span className="notification-dot"></span>
        </button>

        <div className="header-divider"></div>

        {/* User Details & Avatar */}
        <div className="header-user-profile">
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
      </div>
    </header>
  );
};