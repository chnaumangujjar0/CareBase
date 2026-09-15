import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from './components/common/ProtactedRoute'
import Login from './components/pages/Login'
import Dashboard from "./components/pages/Dashboard"
import { SignUp } from './components/pages/SignUp'
import { Onboarding } from './components/pages/Onboarding'

function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        {/* Public Routes - Anyone can access these */}
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path='/onboarding' element={<Onboarding/>}/>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />}/>
          
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
