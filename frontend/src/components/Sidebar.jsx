import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const staffLinks = [
  { to: '/staff', label: '🖥️', text: 'Dashboard' },
];

const adminLinks = [
  { to: '/admin/reports', label: '📊', text: 'Reports' },
  { to: '/admin/devices', label: '🖥️', text: 'Devices' },
  { to: '/admin/staff',   label: '👥', text: 'Staff' },
];

export default function Sidebar() {
  const { role, logout } = useApp();
  const navigate = useNavigate();
  const links = role === 'Admin' ? adminLinks : staffLinks;

  return (
    <aside className="w-56 min-h-screen flex flex-col bg-white/[0.03] backdrop-blur-2xl border-r border-white/[0.07]">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600/40 border border-indigo-500/40 rounded-lg flex items-center justify-center text-base">
            🎮
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">GC Manager</p>
            <p className="text-xs text-white/30 mt-0.5 capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, text }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/30 border border-indigo-500/30 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <span className="text-base">{label}</span>
            {text}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/[0.07]">
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <span>←</span> Logout
        </button>
      </div>
    </aside>
  );
}
