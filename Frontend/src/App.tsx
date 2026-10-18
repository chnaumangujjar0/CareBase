import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ConfigProvider } from "antd";
import { ProtectedRoute } from './components/common/ProtactedRoute';
import Login from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import { SignUp } from './components/pages/SignUp';
import Patient from './components/pages/Patient';
import Onboarding from './components/pages/Onboarding';
import Layout from "./Layout"
import Unauthorized from './components/pages/Unauthorized';
import SuperAdmin from './components/common/SuperAdmin';
import Departments from './components/pages/Department';
import { ToastContainer } from 'react-toastify';
import Staff from './components/pages/Staff';
import Appointments from './components/pages/Appointments';
import { RolesPage } from './components/pages/RolesPage';
import { HospitalProfile } from './components/pages/HospitalProfile';
import { Wards } from './components/pages/Ward';
import { Room } from './components/pages/Room';
import { Bed } from './components/pages/Bed';
import ClinicalDesk from './components/pages/ClinicalDesk';
import ClinicalOperations from './components/pages/ClinicalOperations';
import Pharmacy from './components/pages/Pharmacy';
import AuditLogs from './components/pages/AuditLogs';
import Billing from './components/pages/Billing';
import ApprovalStatus from './components/pages/ApprovalStatus';
import PlatformAdmin from './components/pages/PlatformAdmin';
import HrDashboard from './components/pages/HrDashboard';
import PlatformAdminRoute from './components/common/PlatformAdminRoute';
import { appTheme } from './theme';
import LandingPage from './components/pages/LandingPage';

function App() {
  return (
    <ConfigProvider theme={appTheme}>
    
      <BrowserRouter>
      <ToastContainer 
        position="top-center"
        autoClose={5000}
        hideProgressBar={true} 
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/approval-status" element={<ApprovalStatus />} />
          <Route element={<PlatformAdminRoute />}>
            <Route path="/super-admin" element={<PlatformAdmin />} />
          </Route>
          <Route element={<SuperAdmin/>}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route path='/unauthorized' element={<Unauthorized/>} />
          <Route element={<Layout/>}>
            <Route element={<ProtectedRoute />}>
              <Route element={<ProtectedRoute allowedPermissions={["hr:dashboard:read"]} />}>
                <Route path='/hr' element={<HrDashboard />} />
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["dashboard:read"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["patients:read"]} />}>
                <Route path='/patient' element={<Patient/>}/>
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["appointments:read"]} />}>
                <Route path='/appointments' element={<Appointments/>} />
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["clinical:encounters:read"]} />}>
                <Route path='/clinical' element={<ClinicalDesk />} />
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["clinical:admissions:read"]} />}>
                <Route path='/clinical/operations' element={<ClinicalOperations />} />
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["clinical:medicines:read"]} />}>
                <Route path='/pharmacy' element={<Pharmacy />} />
              </Route>
              <Route element={<ProtectedRoute allowedPermissions={["billing:invoices:read", "billing:rates:read"]} />}>
                <Route path='/billing' element={<Billing />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["Admin","Owner"]} />}>
              <Route path='/settings/departments' element={<Departments/>} />
              <Route path='/settings/roles' element={<RolesPage/>} />
              <Route path='/settings/profile' element={<HospitalProfile/>}/>
              <Route path="/staff" element={<Staff />} />
              <Route path="/facility/wards" element={<Wards />} />
              <Route path="/facility/rooms" element={<Room />} />
              <Route path="/facility/beds" element={<Bed />} />
              <Route path='/audit-logs' element={<AuditLogs />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
