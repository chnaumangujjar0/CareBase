import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ConfigProvider } from "antd";
import { ProtectedRoute } from './components/common/ProtectedRoute';
import SuperAdmin from './components/common/SuperAdmin';
import { ToastContainer } from 'react-toastify';
import PlatformAdminRoute from './components/common/PlatformAdminRoute';
import { appTheme } from './theme';
import PageSkeleton from './components/common/PageSkeleton';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';
import { getDefaultRoute } from './utils/authorization';

const Layout = lazy(() => import('./Layout'));
const LandingPage = lazy(() => import('./components/pages/LandingPage'));
const PublicAppointmentBooking = lazy(() => import('./components/pages/PublicAppointmentBooking'));
const PatientAppointments = lazy(() => import('./components/pages/PatientAppointments'));
const Login = lazy(() => import('./components/pages/Login'));
const SignUp = lazy(() => import('./components/pages/SignUp').then((module) => ({ default: module.SignUp })));
const ApprovalStatus = lazy(() => import('./components/pages/ApprovalStatus'));
const Subscription = lazy(() => import('./components/pages/Subscription'));
const PlatformAdmin = lazy(() => import('./components/pages/PlatformAdmin'));
const Onboarding = lazy(() => import('./components/pages/Onboarding'));
const Unauthorized = lazy(() => import('./components/pages/Unauthorized'));
const HrDashboard = lazy(() => import('./components/pages/HrDashboard'));
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const Patient = lazy(() => import('./components/pages/Patient'));
const Appointments = lazy(() => import('./components/pages/Appointments'));
const ClinicalDesk = lazy(() => import('./components/pages/ClinicalDesk'));
const ClinicalOperations = lazy(() => import('./components/pages/ClinicalOperations'));
const Pharmacy = lazy(() => import('./components/pages/Pharmacy'));
const Billing = lazy(() => import('./components/pages/Billing'));
const Departments = lazy(() => import('./components/pages/Department'));
const RolesPage = lazy(() => import('./components/pages/RolesPage').then((module) => ({ default: module.RolesPage })));
const HospitalProfile = lazy(() => import('./components/pages/HospitalProfile').then((module) => ({ default: module.HospitalProfile })));
const Staff = lazy(() => import('./components/pages/Staff'));
const Wards = lazy(() => import('./components/pages/Ward').then((module) => ({ default: module.Wards })));
const Room = lazy(() => import('./components/pages/Room').then((module) => ({ default: module.Room })));
const Bed = lazy(() => import('./components/pages/Bed').then((module) => ({ default: module.Bed })));
const AuditLogs = lazy(() => import('./components/pages/AuditLogs'));

const HomeRoute = () => {
  const { isReady, user } = useAuthBootstrap();
  if (!isReady) return <PageSkeleton />;
  return user ? <Navigate to={getDefaultRoute(user)} replace /> : <LandingPage />;
};

const RoleHomeRedirect = () => {
  const { isReady, user } = useAuthBootstrap();
  if (!isReady) return <PageSkeleton />;
  return <Navigate to={getDefaultRoute(user)} replace />;
};

function App() {
  return (
    <ConfigProvider theme={appTheme}>
      <BrowserRouter>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/book-appointment" element={<PublicAppointmentBooking />} />
            <Route path="/my-appointments" element={<PatientAppointments />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/approval-status" element={<ApprovalStatus />} />

            <Route element={<PlatformAdminRoute />}>
              <Route path="/super-admin" element={<PlatformAdmin />} />
            </Route>
            <Route element={<SuperAdmin />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route element={<Layout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/subscription" element={<Subscription />} />
                <Route element={<ProtectedRoute allowedPermissions={["hr:dashboard:read"]} />}>
                  <Route path="/hr" element={<HrDashboard />} />
                </Route>
                <Route element={<ProtectedRoute allowedPermissions={["dashboard:read"]} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>
                <Route element={<ProtectedRoute allowedPermissions={["patients:read"]} />}>
                  <Route path="/patient" element={<Patient />} />
                </Route>
                <Route element={<ProtectedRoute allowedPermissions={["appointments:read"]} />}>
                  <Route path="/appointments" element={<Appointments />} />
                </Route>
                <Route element={<ProtectedRoute allowedPermissions={["clinical:encounters:read"]} />}>
                  <Route path="/clinical" element={<ClinicalDesk />} />
                </Route>
                <Route element={<ProtectedRoute allowedPermissions={["clinical:admissions:read"]} />}>
                  <Route path="/clinical/operations" element={<ClinicalOperations />} />
                </Route>
                <Route element={<ProtectedRoute allowedPermissions={["clinical:medicines:read"]} />}>
                  <Route path="/pharmacy" element={<Pharmacy />} />
                </Route>
                <Route element={
                  <ProtectedRoute allowedPermissions={["billing:invoices:read", "billing:rates:read"]} />
                }>
                  <Route path="/billing" element={<Billing />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["Admin", "Owner"]} />}>
                <Route path="/settings/departments" element={<Departments />} />
                <Route path="/settings/roles" element={<RolesPage />} />
                <Route path="/settings/profile" element={<HospitalProfile />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/facility/wards" element={<Wards />} />
                <Route path="/facility/rooms" element={<Room />} />
                <Route path="/facility/beds" element={<Bed />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>

              <Route path="*" element={<RoleHomeRedirect />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
