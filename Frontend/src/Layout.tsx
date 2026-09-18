import { Outlet } from 'react-router';
import { Sidebar } from './components/pages/Sidebar';
import { Header } from './components/pages/Header'; // Adjust path if your Header is saved elsewhere
import './styles/layout.scss'; 

const Layout = () => {
  return (
    <div className="app-layout">
        <Header />
        
      <div className="main-wrapper">
        <Sidebar />
        
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;