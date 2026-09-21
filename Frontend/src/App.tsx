import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
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
function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route element={<SuperAdmin/>}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route path='/unauthorized' element={<Unauthorized/>} />
          <Route element={<Layout/>}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path='/patient' element={<Patient/>}/>
              <Route path='/departments' element={<Departments/>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["doctor", "admin"]} />}>
              {/* <Route path="/clinical/surgery-schedule" element={<DoctorPortal />} />
              <Route path="/clinical/prescriptions" element={<div>Prescription System</div>} /> */}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
