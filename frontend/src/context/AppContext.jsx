import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';
import { setTicks, setTick, removeTick } from '../api/tickStore';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const role = user?.role ? (user.role === 'admin' ? 'Admin' : 'Staff') : null;

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    const { accessToken, refreshToken, user: u } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
  };

  // ── Normalisation ─────────────────────────────────────────────────────────
  const normaliseDevice = (d) => ({
    ...d,
    id:     d._id,
    label:  d.name,
    status: d.status.charAt(0).toUpperCase() + d.status.slice(1).replace('_', ' '),
    type:   d.type === 'ps5' ? 'PS5' : 'PC',
  });

  const normaliseSession = (s) => ({
    ...s,
    id:            s._id,
    deviceId:      s.device?._id || s.device,
    sessionState:  s.status,
    duration:      s.durationMinutes,
    paymentMethod: '',
    amount:        0,
  });

  // ── Devices ───────────────────────────────────────────────────────────────
  const [devices, setDevices] = useState([]);

  const fetchDevices = useCallback(async () => {
    const { data } = await api.get('/devices');
    setDevices(data.data.map(normaliseDevice));
  }, []);

  const addDevice = async (form) => {
    const payload = {
      name:     form.label || form.name,
      type:     form.type === 'PS5' ? 'ps5' : 'pc',
      status:   (form.status || 'available').toLowerCase(),
      capacity: form.capacity || null,
    };
    const { data } = await api.post('/devices', payload);
    setDevices((prev) => [...prev, normaliseDevice(data.data)]);
  };

  const updateDevice = async (id, patch) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id || d._id === id) ? { ...d, ...patch } : d)
    );
    if (patch.label || patch.name || patch.type) {
      const payload = {
        name:     patch.label || patch.name,
        type:     patch.type === 'PS5' ? 'ps5' : 'pc',
        status:   (patch.status || 'available').toLowerCase(),
        capacity: patch.capacity || null,
      };
      const { data } = await api.put(`/devices/${id}`, payload);
      setDevices((prev) =>
        prev.map((d) => (d.id === id || d._id === id) ? normaliseDevice(data.data) : d)
      );
    }
  };

  const removeDevice = async (id) => {
    await api.delete(`/devices/${id}`);
    setDevices((prev) => prev.filter((d) => d.id !== id && d._id !== id));
    setSessions((prev) => prev.filter((s) => s.deviceId !== id));
  };

  // ── Sessions ──────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);

  const fetchActiveSessions = useCallback(async () => {
    const { data } = await api.get('/sessions/active');
    const normed = data.data.map(normaliseSession);
    setSessions(normed);
    // Seed tick store for all running sessions
    setTicks(normed
      .filter((s) => s.sessionState === 'running' && s.remainingSeconds != null)
      .map((s) => ({ sessionId: s.id || s._id, remainingSeconds: s.remainingSeconds }))
    );
    setDevices((prev) => {
      const statusMap = {};
      data.data.forEach((s) => {
        const devId = s.device?._id || s.device;
        const raw   = s.device?.status || s.status;
        statusMap[devId] = raw.charAt(0).toUpperCase() + raw.slice(1);
      });
      return prev.map((d) => statusMap[d.id] ? { ...d, status: statusMap[d.id] } : d);
    });
  }, []);

  const addSession    = (s)        => setSessions((prev) => [...prev, s]);
  const removeSession = (id)       => setSessions((prev) => prev.filter((s) => s.id !== id && s._id !== id));
  const updateSession = (id, patchOrFn) =>
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id && s._id !== id) return s;
        const patch = typeof patchOrFn === 'function' ? patchOrFn(s) : patchOrFn;
        return { ...s, ...patch };
      })
    );

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  // Use a ref so socket handlers always see latest state setters without re-subscribing
  const setDevicesRef  = useRef(setDevices);
  const setSessionsRef = useRef(setSessions);
  useEffect(() => { setDevicesRef.current  = setDevices;  }, []);
  useEffect(() => { setSessionsRef.current = setSessions; }, []);

  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    // Helper: update device status by id from a socket payload
    const syncDeviceStatus = ({ deviceId, status }) => {
      const cap = status.charAt(0).toUpperCase() + status.slice(1);
      setDevicesRef.current((prev) =>
        prev.map((d) => (d.id === deviceId || d._id === deviceId) ? { ...d, status: cap } : d)
      );
    };

    // Helper: upsert a session from a full session payload
    const upsertSession = (session) => {
      const norm = normaliseSession(session);
      // Seed tick store so the timer display has an initial value
      if (norm.remainingSeconds != null) setTick(norm.id || norm._id, norm.remainingSeconds);
      setSessionsRef.current((prev) => {
        const exists = prev.some((s) => s.id === norm.id || s._id === norm._id);
        return exists
          ? prev.map((s) => (s.id === norm.id || s._id === norm._id) ? norm : s)
          : [...prev, norm];
      });
    };

    socket.on('SESSION_CREATED', ({ session }) => upsertSession(session));

    socket.on('SESSION_STARTED', ({ session }) => upsertSession(session));

    socket.on('CODE_VERIFIED', ({ sessionId }) => {
      setSessionsRef.current((prev) =>
        prev.map((s) => (s.id === sessionId || s._id === sessionId)
          ? { ...s, sessionState: 'running', status: 'running' } : s)
      );
    });

    socket.on('SESSION_PAUSED', ({ sessionId }) => {
      setSessionsRef.current((prev) =>
        prev.map((s) => (s.id === sessionId || s._id === sessionId)
          ? { ...s, sessionState: 'paused', status: 'paused' } : s)
      );
    });

    socket.on('SESSION_RESUMED', ({ sessionId }) => {
      setSessionsRef.current((prev) =>
        prev.map((s) => (s.id === sessionId || s._id === sessionId)
          ? { ...s, sessionState: 'running', status: 'running' } : s)
      );
    });

    socket.on('SESSION_EXTENDED', ({ sessionId, remainingSeconds, durationMinutes }) => {
      setTick(sessionId, remainingSeconds);
      setSessionsRef.current((prev) =>
        prev.map((s) => (s.id === sessionId || s._id === sessionId)
          ? { ...s, remainingSeconds, durationMinutes, duration: durationMinutes } : s)
      );
    });

    socket.on('SESSION_ENDED', ({ sessionId }) => {
      removeTick(sessionId);
      setSessionsRef.current((prev) => prev.filter((s) => s.id !== sessionId && s._id !== sessionId));
    });

    socket.on('SESSION_EXPIRED', ({ sessionId }) => {
      removeTick(sessionId);
      setSessionsRef.current((prev) =>
        prev.map((s) => (s.id === sessionId || s._id === sessionId)
          ? { ...s, sessionState: 'expired', status: 'expired', remainingSeconds: 0 } : s)
      );
    });

    socket.on('DEVICE_STATUS_CHANGED', syncDeviceStatus);

    // Clear not-responding badge when device comes back (any status change = it's alive)
    socket.on('DEVICE_STATUS_CHANGED', ({ deviceId }) => {
      setFailedDeviceIds((prev) => {
        if (!prev.has(deviceId)) return prev;
        const next = new Set(prev); next.delete(deviceId); return next;
      });
    });

    socket.on('COMMAND_FAILED', ({ deviceId }) => {
      setFailedDeviceIds((prev) => new Set(prev).add(deviceId));
    });

    // Tick: write to tickStore only — zero React state updates, only SessionTimer re-renders
    socket.on('REMAINING_TIME_TICK', (ticks) => setTicks(ticks));

    return () => {
      socket.off('SESSION_CREATED');
      socket.off('SESSION_STARTED');
      socket.off('CODE_VERIFIED');
      socket.off('SESSION_PAUSED');
      socket.off('SESSION_RESUMED');
      socket.off('SESSION_EXTENDED');
      socket.off('SESSION_ENDED');
      socket.off('SESSION_EXPIRED');
      socket.off('DEVICE_STATUS_CHANGED');
      socket.off('REMAINING_TIME_TICK');
      socket.off('COMMAND_FAILED');
    };
  }, [user]);

  // ── Staff ─────────────────────────────────────────────────────────────────
  const [staff, setStaff]   = useState([]);
  const addStaff    = (m)  => setStaff((p) => [...p, m]);
  const removeStaff = (id) => setStaff((p) => p.filter((s) => s.id !== id));

  // ── Failed devices (COMMAND_FAILED / timeout) ─────────────────────────────
  const [failedDeviceIds, setFailedDeviceIds] = useState(new Set());

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [upiQR, setUpiQR]               = useState(null);
  const [setupDone, setSetupDone]       = useState(false);
  const [adminAccount, setAdminAccount] = useState(null);

  return (
    <AppContext.Provider value={{
      user, role, login, logout,
      devices, setDevices, fetchDevices, addDevice, updateDevice, removeDevice,
      sessions, setSessions, fetchActiveSessions,
      addSession, updateSession, removeSession,
      staff, addStaff, removeStaff,
      failedDeviceIds,
      upiQR, setUpiQR, setupDone, setSetupDone, adminAccount, setAdminAccount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
