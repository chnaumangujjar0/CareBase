import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './components/common/ProtactedRoute';
import Login from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import { SignUp } from './components/pages/SignUp';
import Patient from './components/pages/Patient';
import Onboarding from './components/pages/Onboarding';
import Layout from "./Layout"
function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<Layout/>}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path='/patient' element={<Patient/>}/>
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
