import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Reports from './admin/Reports';
import DeviceManagement from './admin/DeviceManagement';
import StaffManagement from './admin/StaffManagement';

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Navigate to="reports" replace />} />
          <Route path="reports" element={<Reports />} />
          <Route path="devices" element={<DeviceManagement />} />
          <Route path="staff"   element={<StaffManagement />} />
        </Routes>
      </main>
    </div>
  );
}
