import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import DeviceCard from '../components/DeviceCard';
import SessionCard from '../components/SessionCard';
import SessionModal from '../components/SessionModal';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';

export default function StaffDashboard() {
  const { devices, sessions, fetchDevices, fetchActiveSessions, failedDeviceIds } = useApp();
  const [modalOpen, setModalOpen]     = useState(false);
  const [preselected, setPreselected] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([fetchDevices(), fetchActiveSessions()]);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [fetchDevices, fetchActiveSessions]);

  // Initial load
  useEffect(() => { loadAll(); }, [loadAll]);

  const openModal  = (device = null) => { setPreselected(device); setModalOpen(true); };
  const closeModal = () => { setPreselected(null); setModalOpen(false); };

  const pcs  = devices.filter((d) => d.type === 'PC');
  const ps5s = devices.filter((d) => d.type === 'PS5');

  const activeCount    = sessions.length;
  const availableCount = devices.filter((d) => d.status === 'Available').length;
  const expiredCount   = sessions.filter((s) => s.sessionState === 'expired').length;

  function renderDevice(device) {
    const devId        = device.id || device._id;
    const notResponding = failedDeviceIds.has(devId?.toString());
    const session = sessions.find(
      (s) => s.deviceId === device.id || s.deviceId === device._id
    );
    if (session) return <SessionCard key={device.id} session={session} device={device} onRefresh={loadAll} notResponding={notResponding} />;
    return <DeviceCard key={device.id} device={device} onNewSession={openModal} notResponding={notResponding} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Staff Dashboard</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-white/40">{activeCount} active</span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-green-400/70">{availableCount} available</span>
              {expiredCount > 0 && (
                <><span className="text-white/20">·</span>
                <span className="text-xs text-red-400">{expiredCount} expired</span></>
              )}
            </div>
          </div>
          <button onClick={() => openModal(null)} className="btn-primary px-4 py-2 text-sm">
            + New Session
          </button>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Gaming PCs */}
            {pcs.length > 0 && (
              <section className="mb-8">
                <p className="section-label mb-3">
                  Gaming PCs <span className="text-white/20 font-normal normal-case tracking-normal">({pcs.length})</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pcs.map(renderDevice)}
                </div>
              </section>
            )}

            {/* PS5 Rooms */}
            {ps5s.length > 0 && (
              <section>
                <p className="section-label mb-3">
                  PS5 Rooms <span className="text-white/20 font-normal normal-case tracking-normal">({ps5s.length})</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ps5s.map(renderDevice)}
                </div>
              </section>
            )}

            {devices.length === 0 && (
              <div className="text-center py-24 text-white/20">
                <p className="text-4xl mb-3">🖥️</p>
                <p className="text-sm">No devices yet. Add them in Admin → Devices.</p>
              </div>
            )}
          </>
        )}

        {modalOpen && (
          <SessionModal
            preselectedDevice={preselected}
            onClose={closeModal}
            onCreated={loadAll}
          />
        )}
      </main>
    </div>
  );
}
