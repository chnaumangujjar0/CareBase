import { useState } from 'react'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from './components/common/ProtactedRoute'
import Login from './components/pages/Login'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <BrowserRouter>
      <Routes>
        {/* Public Routes - Anyone can access these */}
        <Route path="/login" element={<Login/>} />
        {/* <Route path="/unauthorized" element={<Unauthorized />} /> */}

        <Route element={<ProtectedRoute />}>
          {/* <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<div>Patient List Here</div>} /> */}
        </Route>

        {/* Strictly Protected Routes - ONLY Doctors and Admins can access */}
        <Route element={<ProtectedRoute allowedRoles={["doctor", "admin"]} />}>
          {/* <Route path="/clinical/surgery-schedule" element={<DoctorPortal />} />
          <Route path="/clinical/prescriptions" element={<div>Prescription System</div>} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
