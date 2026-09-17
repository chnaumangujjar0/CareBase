import { Outlet } from 'react-router';
import { Sidebar } from './components/pages/Sidebar';

const Layout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: '70px', width: '100%', minHeight: '100vh', padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout