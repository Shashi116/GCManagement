import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import Spinner from './Spinner';

const PRESET_DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '2 hr',   value: 120 },
  { label: 'Custom', value: 'custom' },
];

export default function SessionModal({ preselectedDevice, onClose, onCreated }) {
  const { devices, upiQR } = useApp();
  const availableDevices = devices.filter((d) => d.status === 'Available');

  const [deviceId, setDeviceId]             = useState(preselectedDevice?._id || preselectedDevice?.id || '');
  const [customerName, setCustomerName]     = useState('');
  const [durationPreset, setDurationPreset] = useState(60);
  const [customMinutes, setCustomMinutes]   = useState('');
  const [paymentMethod, setPaymentMethod]   = useState('Cash');
  const [amount, setAmount]                 = useState('');
  const [createdSession, setCreatedSession] = useState(null);
  const [showUpiQR, setShowUpiQR]           = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const isCustom      = durationPreset === 'custom';
  const finalDuration = isCustom ? Number(customMinutes) : durationPreset;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviceId || !customerName || !amount) return;
    if (isCustom && (!customMinutes || Number(customMinutes) < 1)) return;

    setLoading(true);
    setError('');
    try {
      // 1. Create session → backend generates code
      const { data: sessionData } = await api.post('/sessions', {
        deviceId,
        customerName: customerName.trim(),
        durationMinutes: finalDuration,
      });
      const session = sessionData.data;

      // 2. Record payment
      await api.post('/payments', {
        sessionId: session._id,
        amount:    Number(amount),
        method:    paymentMethod.toLowerCase(),
      });

      setCreatedSession({ ...session, paymentMethod, amount: Number(amount) });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const toggleBtn = (active) =>
    `py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
      active
        ? 'bg-indigo-600/80 border-indigo-500/60 text-white shadow-lg shadow-indigo-500/20'
        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
    }`;

  // ── Code confirmation screen ──────────────────────────────────────────────
  if (createdSession) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass-md p-8 w-full max-w-sm text-center shadow-2xl shadow-black/50">
          <div className="w-16 h-16 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🎮
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Session Created!</h2>
          <p className="text-white/40 text-sm mb-6">Tell the customer to enter this code on the PC</p>

          <div className="bg-indigo-600/10 border-2 border-indigo-500/30 rounded-2xl py-5 px-6 mb-4">
            <p className="text-xs text-indigo-400/60 font-medium mb-2 uppercase tracking-widest">Session Code</p>
            <p className="text-5xl font-mono font-bold text-indigo-400 tracking-[0.2em]">{createdSession.code}</p>
          </div>

          {paymentMethod === 'UPI' && (
            <div className="mb-4">
              <button
                onClick={() => setShowUpiQR((v) => !v)}
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {showUpiQR ? 'Hide' : 'Show'} UPI QR Code
              </button>
              {showUpiQR && upiQR && (
                <img src={upiQR} alt="UPI QR" className="mx-auto mt-3 max-h-40 rounded-xl border border-white/10" />
              )}
              {showUpiQR && !upiQR && (
                <p className="text-xs text-white/30 mt-2">No UPI QR uploaded yet.</p>
              )}
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left space-y-1 text-xs mb-5">
            <p><span className="text-white/40">Customer:</span> <span className="text-white/80">{createdSession.customerName}</span></p>
            <p><span className="text-white/40">Duration:</span> <span className="text-white/80">{finalDuration} min</span></p>
            <p><span className="text-white/40">Payment:</span> <span className="text-white/80">{paymentMethod} · ₹{amount}</span></p>
          </div>

          <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">Done</button>
        </div>
      </div>
    );
  }

  // ── New session form ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-md p-6 w-full max-w-md shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">New Session</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xl transition-all">×</button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-xl">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Device */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Device</label>
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required
              className="glass-input" style={{ colorScheme: 'dark' }}>
              <option value="" className="bg-gray-900">Select device…</option>
              {availableDevices.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id} className="bg-gray-900">
                  {d.label || d.name} ({d.type})
                </option>
              ))}
            </select>
          </div>

          {/* Customer name */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Customer Name</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              required placeholder="Enter name" className="glass-input" />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-2">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_DURATIONS.map(({ label, value }) => (
                <button key={value} type="button" onClick={() => setDurationPreset(value)}
                  className={toggleBtn(durationPreset === value)}>{label}</button>
              ))}
            </div>
            {isCustom && (
              <input type="number" min="1" max="480" value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Enter minutes" required className="glass-input mt-2" />
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['Cash', 'UPI'].map((m) => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={toggleBtn(paymentMethod === m)}>
                  {m === 'Cash' ? '💵 Cash' : '📱 UPI'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                required min="1" placeholder="0" className="glass-input pl-8" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-2.5 text-sm mt-1 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <><Spinner size="sm" /> Creating…</> : 'Create Session →'}
          </button>
        </form>
      </div>
    </div>
  );
}
