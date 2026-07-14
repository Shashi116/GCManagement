import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Spinner from '../components/Spinner';

export default function Login() {
  const { login }  = useApp();
  const navigate   = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      navigate(u.role === 'admin' ? '/admin/reports' : '/staff');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <div className="glass-md shadow-2xl shadow-black/40 p-10 w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎮
          </div>
          <h1 className="text-2xl font-bold text-white">GC Manager</h1>
          <p className="text-white/40 text-sm mt-1">Gaming Café Management</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded-xl">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Enter username"
              className="glass-input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              className="glass-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm mt-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <><Spinner size="sm" /> Signing in…</> : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-6">
          First time?{' '}
          <a href="/setup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Run Setup Wizard
          </a>
        </p>
      </div>
    </div>
  );
}
