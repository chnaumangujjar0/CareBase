import { NavLink } from 'react-router';
import { useSelector } from 'react-redux';
import { 
  LayoutDashboard, BarChart2, Calendar, Users, 
  Stethoscope, Building, Bed, FileText, 
  Activity, FlaskConical, Pill, Receipt, 
  UsersRound, Link2, Settings
} from 'lucide-react';
import '../../styles/sidebar.scss';
import { selectCurrentUser } from '../../store/authSlice';
import Logo from "../../../public/carebase-logo-icon.svg"

// Configuration array mapping the reference image
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
    ]
  },
  {
    title: "Care & Services",
    items: [
      { label: "Emergency", path: "/emergency", icon: Activity },
      { label: "Lab", path: "/lab", icon: FlaskConical },
      { label: "Pharmacy", path: "/pharmacy", icon: Pill },
      { label: "Billing", path: "/billing", icon: Receipt },
    ]
  },
  {
    title: "System",
    items: [
      { label: "Staff Management", path: "/staff", icon: UsersRound },
      { label: "Integrations", path: "/integrations", icon: Link2 },
      { label: "Settings", path: "/settings", icon: Settings },
    ]
  }
];

export const Sidebar = () => {
  // Grabbing the logged-in user dynamically
  const user = useSelector(selectCurrentUser);

  return (
    <aside className="sidebar">
      {/* Header / Brand */}
      <div className="header">
        <img src={Logo} alt='carbase logo' className='brandLogo'/>
        <span className="brandText"><span className='logostart'>Care</span><span className='logoend'>Base</span></span>
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
                className={({ isActive }) => 
                  isActive ? 'link active' : 'link'
                }
              >
                <item.icon className="linkIcon" size={20} />
                <span className="linkLabel">{item.label}</span>
              </NavLink>
            ))}
            
            {/* Render a divider unless it's the last section */}
            {index < navConfig.length - 1 && <div className="divider" />}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="footer">
        <img 
          src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=E2E8F0&color=0F766E`} 
          alt="User Avatar" 
          className="avatar" 
        />
        <div className="userInfo">
          <p className="userName">{user?.name || "Staff Member"}</p>
          <p className="userEmail">{user?.email || "staff@carebase.com"}</p>
        </div>
      </div>
    </aside>
  );
};