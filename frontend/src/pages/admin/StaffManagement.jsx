import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

export default function StaffManagement() {
  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [adding, setAdding]     = useState(false);
  const [formError, setFormError] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get('/staff');
      setStaff(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !username.trim() || !password) return;
    if (password.length < 6) { setFormError('Password must be at least 6 characters'); return; }

    setAdding(true);
    try {
      const { data } = await api.post('/staff', { name: name.trim(), username: username.trim(), password });
      setStaff((prev) => [data.data, ...prev]);
      setName(''); setUsername(''); setPassword('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add staff member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/staff/${id}`);
      setStaff((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove staff member');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Staff Management</h2>

      {/* Add form */}
      <form onSubmit={handleAdd} className="glass p-5 space-y-4">
        <p className="text-sm font-medium text-white/50">Add New Staff Member</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="glass-input"
            required
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            placeholder="Username"
            className="glass-input"
            autoComplete="off"
            required
          />
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6)"
              className="glass-input w-full pr-14"
              autoComplete="new-password"
              required
            />
            <button type="button" onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60 transition-colors">
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {formError && <p className="text-xs text-red-400">{formError}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={adding || !name.trim() || !username.trim() || !password}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-40">
            {adding ? 'Adding…' : '+ Add Staff'}
          </button>
        </div>
      </form>

      {/* Staff list */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-red-400/70 py-12 text-sm">{error}</p>
        ) : staff.length === 0 ? (
          <p className="text-center text-white/20 py-12 text-sm">No staff members yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {staff.map((s) => (
              <li key={s._id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-400">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white/80 text-sm">{s.name}</p>
                    <p className="text-xs text-white/30">@{s.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/20">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleRemove(s._id)}
                    className="text-red-400/50 hover:text-red-400 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
