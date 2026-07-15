import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';
import ErrorBanner from '../../components/ErrorBanner';

const STATUS_DOT = {
  available: 'bg-green-400', waiting: 'bg-yellow-400', running: 'bg-blue-400',
  paused: 'bg-orange-400', offline: 'bg-gray-500', maintenance: 'bg-red-500',
  reserved: 'bg-purple-400', expired: 'bg-red-500', online: 'bg-green-300',
};
const STATUS_TEXT = {
  available: 'text-green-400', waiting: 'text-yellow-400', running: 'text-blue-400',
  paused: 'text-orange-400', offline: 'text-gray-500', maintenance: 'text-red-400',
  reserved: 'text-purple-400', expired: 'text-red-400', online: 'text-green-300',
};
const STATUSES = ['available', 'offline', 'maintenance', 'reserved'];

function CredentialsModal({ deviceId, deviceSecret, onClose }) {
  const [copiedId, setCopiedId]         = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const copy = async (text, setCopied) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-md w-full max-w-md shadow-2xl shadow-black/60 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-xl shrink-0">🔑</div>
          <div>
            <h3 className="font-bold text-white text-base">Device Credentials</h3>
            <p className="text-xs text-yellow-400 mt-0.5 font-medium">⚠ Save these now — the secret will never be shown again</p>
          </div>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Enter these values into the Agent's <span className="font-mono text-white/60">config.json</span> on this device.
        </p>
        <div className="space-y-1">
          <label className="text-xs font-medium text-white/40">Device ID</label>
          <div className="flex gap-2">
            <code className="flex-1 glass-input font-mono text-xs text-indigo-300 truncate py-2.5">{deviceId}</code>
            <button onClick={() => copy(deviceId, setCopiedId)}
              className="px-3 py-2 text-xs rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 transition-all whitespace-nowrap">
              {copiedId ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-white/40">Device Secret</label>
          <div className="flex gap-2">
            <code className="flex-1 glass-input font-mono text-xs text-green-300 truncate py-2.5">{deviceSecret}</code>
            <button onClick={() => copy(deviceSecret, setCopiedSecret)}
              className="px-3 py-2 text-xs rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 transition-all whitespace-nowrap">
              {copiedSecret ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
          Once you close this dialog, the secret cannot be retrieved. If lost, remove and re-add the device.
        </div>
        <button onClick={onClose} className="w-full btn-primary py-2.5 text-sm">I've saved the credentials</button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', type: '', status: 'available', capacity: '' };

export default function DeviceManagement() {
  const { devices, fetchDevices, updateDevice, removeDevice } = useApp();
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [knownTypes, setKnownTypes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchDevices(),
      api.get('/devices/types').then(({ data }) => setKnownTypes(data.data)),
    ])
      .catch((e) => setError(e.response?.data?.message || 'Failed to load devices'))
      .finally(() => setLoading(false));
  }, [fetchDevices]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type.trim()) { setError('Device type is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateDevice(editingId, {
          label:    form.name,
          name:     form.name,
          type:     form.type.trim().toLowerCase(),
          status:   form.status,
          capacity: form.capacity ? Number(form.capacity) : null,
        });
        resetForm();
      } else {
        const { data } = await api.post('/devices', {
          name:     form.name,
          type:     form.type.trim().toLowerCase(),
          status:   form.status || 'available',
          capacity: form.capacity ? Number(form.capacity) : null,
        });
        await fetchDevices();
        // Refresh known types in case a new one was added
        api.get('/devices/types').then(({ data: d }) => setKnownTypes(d.data));
        resetForm();
        setCredentials({ deviceId: data.data._id, deviceSecret: data.data.deviceSecret });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save device');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    setError('');
    try { await removeDevice(id); }
    catch (err) { setError(err.response?.data?.message || 'Failed to remove device'); }
  };

  const startEdit = (d) => {
    setForm({
      name:     d.label || d.name,
      type:     (d.type || '').toLowerCase(),
      status:   (d.status || 'available').toLowerCase(),
      capacity: d.capacity ?? '',
    });
    setEditingId(d._id || d.id);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {credentials && (
        <CredentialsModal
          deviceId={credentials.deviceId}
          deviceSecret={credentials.deviceSecret}
          onClose={() => setCredentials(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Device Management</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary px-4 py-2 text-sm">
          + Add Device
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {showForm && (
        <div className="glass p-5 border border-indigo-500/20">
          <h3 className="font-semibold text-white/70 mb-4 text-sm">{editingId ? 'Edit Device' : 'New Device'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-white/40 mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="e.g. PC 7, PS5 Room 1, VR Pod 2" className="glass-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Type</label>
              {/* Free-text with datalist — any type is valid, existing ones suggested */}
              <input
                list="device-types"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                required
                placeholder="pc, ps5, vr, console…"
                className="glass-input"
                autoComplete="off"
              />
              <datalist id="device-types">
                {knownTypes.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="glass-input" style={{ colorScheme: 'dark' }}>
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-gray-900">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Capacity <span className="text-white/20">(optional)</span></label>
              <input type="number" min="1" value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="e.g. 2 for multiplayer" className="glass-input" />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={resetForm} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving}
                className="btn-primary px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-60">
                {saving ? <><Spinner size="sm" />{editingId ? 'Saving…' : 'Adding…'}</> : editingId ? 'Save Changes' : 'Add Device'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Name', 'Type', 'Capacity', 'Status', 'Last Seen', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider ${i === 5 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {devices.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-white/20 text-sm">No devices yet.</td></tr>
              ) : devices.map((d) => {
                const rawStatus = (d.status || 'available').toLowerCase();
                const lastSeen  = d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : <span className="text-white/20">Never</span>;
                return (
                  <tr key={d._id || d.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 font-medium text-white/80">{d.label || d.name}</td>
                    <td className="px-5 py-3 text-white/50 uppercase text-xs font-semibold tracking-wide">{d.type}</td>
                    <td className="px-5 py-3 text-white/30 text-xs">{d.capacity ?? <span className="text-white/15">—</span>}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_TEXT[rawStatus] || 'text-white/40'}`}>
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[rawStatus] || 'bg-gray-500'}`} />
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/30">{lastSeen}</td>
                    <td className="px-5 py-3 text-right space-x-3">
                      <button onClick={() => startEdit(d)} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">Edit</button>
                      <button onClick={() => handleRemove(d._id || d.id)} className="text-red-400/70 hover:text-red-400 text-xs font-medium transition-colors">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
