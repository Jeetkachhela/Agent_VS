import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AgentDashboard from './pages/AgentDashboard'

// Safe Auth check — handles corrupted localStorage gracefully
const ProtectedRoute = ({ children, roles }) => {
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('user'))
  } catch (e) {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.some(r => r.toUpperCase() === user.role.toUpperCase())) return <Navigate to="/login" />
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Super Admin Dashboard */}
        <Route 
          path="/super-admin/*" 
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Admin B2C Dashboard */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute roles={['ADMIN_B2C']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Agent Dashboard */}
        <Route 
          path="/agent/*" 
          element={
            <ProtectedRoute roles={['AGENT']}>
              <AgentDashboard />
            </ProtectedRoute>
          } 
        />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App
