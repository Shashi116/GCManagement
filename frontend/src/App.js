import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import api from './api/axios';
import Login from './pages/Login';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SetupWizard from './pages/SetupWizard';

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes({ setupRequired }) {
  const { user } = useApp();

  // If setup not done, only allow /setup
  if (setupRequired) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/staff"
        element={
          <ProtectedRoute requiredRole="staff">
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          !user                 ? <Navigate to="/login" replace /> :
          user.role === 'admin' ? <Navigate to="/admin/reports" replace /> :
                                  <Navigate to="/staff" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [setupRequired, setSetupRequired] = useState(null); // null = loading

  useEffect(() => {
    api.get('/setup/status')
      .then(({ data }) => setSetupRequired(data.data.setupRequired))
      .catch(() => setSetupRequired(false)); // if endpoint fails, assume setup done
  }, []);

  if (setupRequired === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes setupRequired={setupRequired} />
      </AppProvider>
    </BrowserRouter>
  );
}
