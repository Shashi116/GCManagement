import React, { useState, useSyncExternalStore } from 'react';
import api from '../api/axios';
import Spinner from './Spinner';
import { subscribe, getTick } from '../api/tickStore';

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Subscribes only to tick store for this session — no context, no dashboard re-render
function SessionTimer({ sessionId, fallback, duration }) {
  const remainingSeconds = useSyncExternalStore(
    (cb) => subscribe(sessionId, cb),
    ()  => getTick(sessionId) ?? fallback,
    ()  => fallback,
  );

  const isLow = remainingSeconds < 300;
  const pct   = Math.min(100, ((remainingSeconds || 0) / (duration * 60)) * 100);

  return (
    <>
      <p className={`text-3xl font-mono font-bold text-center tabular-nums ${isLow ? 'text-red-400' : 'text-white'}`}>
        {formatTime(remainingSeconds)}
      </p>
      <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-red-400' : 'bg-indigo-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-md p-6 w-80 shadow-2xl shadow-black/50">
        <p className="text-white/80 font-medium text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 btn-ghost py-2 text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-500/80 hover:bg-red-500 border border-red-500/40 text-white rounded-xl py-2 text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Spinner size="sm" /> : 'End Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ state }) {
  const map = {
    waiting: { label: 'Waiting Code', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
    running: { label: 'Running',      cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    paused:  { label: 'Paused',       cls: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
    expired: { label: 'Expired',      cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  };
  const { label, cls } = map[state] || { label: state, cls: 'bg-white/10 text-white/50 border-white/10' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export default function SessionCard({ session, device, onRefresh, notResponding }) {
  const [busy, setBusy]               = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError]             = useState('');

  const sid = session._id || session.id;

  const { sessionState, remainingSeconds, customerName, code, paymentMethod, amount, durationMinutes } = session;
  const duration   = durationMinutes || session.duration || 60;
  const isRunning  = sessionState === 'running';
  const isPaused   = sessionState === 'paused';
  const isWaiting  = sessionState === 'waiting';
  const isExpired  = sessionState === 'expired';

  async function call(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const handleVerifyCode = () =>
    call(() => api.post(`/sessions/${sid}/verify-code`, { code }));

  const handlePause   = () => call(() => api.patch(`/sessions/${sid}/pause`));
  const handleResume  = () => call(() => api.patch(`/sessions/${sid}/resume`));
  const handleExtend  = (mins) => call(() => api.patch(`/sessions/${sid}/extend`, { minutes: mins }));
  const handleEnd     = async () => {
    setConfirmLoading(true);
    try {
      await api.patch(`/sessions/${sid}/end`);
      await onRefresh?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end session');
    } finally {
      setConfirmLoading(false);
      setShowConfirm(false);
    }
  };

  const borderGlow = isExpired  ? 'border-red-500/50 animate-pulse'
    : isRunning ? 'border-blue-500/30'
    : isPaused  ? 'border-orange-500/30'
    : isWaiting ? 'border-yellow-500/30'
    : 'border-white/10';

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          message={`End session for ${customerName}? This cannot be undone.`}
          onConfirm={handleEnd}
          onCancel={() => setShowConfirm(false)}
          loading={confirmLoading}
        />
      )}

      <div className={`bg-white/5 backdrop-blur-xl border rounded-2xl shadow-lg overflow-hidden flex flex-col ${borderGlow}`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div>
            <p className="font-semibold text-white text-sm">{device.label || device.name}</p>
            <p className="text-xs text-white/30 mt-0.5 uppercase tracking-wide">
              {device.type}{device.capacity ? ` · Cap: ${device.capacity}` : ''}
            </p>
          </div>
          <StatusBadge state={sessionState} />
        </div>

        {notResponding && (
          <div className="mx-4 flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5 font-medium">
            ⚠ Not responding
          </div>
        )}

        {/* Customer + code */}
        <div className="px-4 py-2 border-t border-white/[0.06]">
          <p className="text-sm font-semibold text-white">{customerName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-white/30">Code:</span>
            <span className="font-mono font-bold text-indigo-400 text-sm tracking-widest">{code}</span>
          </div>
          {(paymentMethod || amount > 0) && (
            <p className="text-xs text-white/30 mt-0.5">
              {paymentMethod} {amount > 0 ? `· ₹${amount}` : ''}
            </p>
          )}
        </div>

        {/* Timer */}
        {!isWaiting && (
          <div className="px-4 py-3">
            {isExpired ? (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">EXPIRED</p>
                <p className="text-xs text-red-400/60 mt-0.5">Session time is up</p>
              </div>
            ) : (
              <SessionTimer sessionId={sid} fallback={remainingSeconds} duration={duration} />
            )}
          </div>
        )}

        {/* Waiting CTA — simulate code entry until Windows Agent exists */}
        {isWaiting && (
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-yellow-400/70 font-medium mb-2">⏳ Waiting for customer to enter code</p>
            {/* TODO: remove in Stage 3 — auto-triggered by agent CODE_VERIFIED socket event */}
            <button onClick={handleVerifyCode} disabled={busy}
              className="w-full text-xs bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 rounded-lg py-1.5 font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
              {busy ? <Spinner size="sm" /> : '▶'} Simulate Code Entry (mock)
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mx-4 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
            ⚠ {error}
          </p>
        )}

        {/* Controls */}
        <div className="px-4 pb-4 mt-auto space-y-2">
          {(isRunning || isPaused) && (
            <>
              <div className="flex gap-2">
                {isRunning ? (
                  <button onClick={handlePause} disabled={busy}
                    className="flex-1 text-xs bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded-lg py-1.5 font-medium transition-all disabled:opacity-50">
                    ⏸ Pause
                  </button>
                ) : (
                  <button onClick={handleResume} disabled={busy}
                    className="flex-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg py-1.5 font-medium transition-all disabled:opacity-50">
                    ▶ Resume
                  </button>
                )}
                <button onClick={() => setShowConfirm(true)} disabled={busy}
                  className="flex-1 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg py-1.5 font-medium transition-all disabled:opacity-50">
                  ⏹ End
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExtend(15)} disabled={busy}
                  className="flex-1 text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg py-1.5 font-medium transition-all disabled:opacity-50">
                  +15 min
                </button>
                <button onClick={() => handleExtend(30)} disabled={busy}
                  className="flex-1 text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg py-1.5 font-medium transition-all disabled:opacity-50">
                  +30 min
                </button>
              </div>
            </>
          )}
          {isExpired && (
            <button onClick={() => setShowConfirm(true)} disabled={busy}
              className="w-full text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg py-2 font-medium transition-all disabled:opacity-50">
              Clear Session
            </button>
          )}
        </div>
      </div>
    </>
  );
}
