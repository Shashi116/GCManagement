import React from 'react';

const STATUS_DOT = {
  Available:   'bg-green-400 shadow-green-400/60',
  Waiting:     'bg-yellow-400 shadow-yellow-400/60',
  Running:     'bg-blue-400 shadow-blue-400/60',
  Paused:      'bg-orange-400 shadow-orange-400/60',
  Offline:     'bg-gray-500',
  Online:      'bg-green-300 shadow-green-300/60',
  Maintenance: 'bg-red-500 shadow-red-500/60',
  Reserved:    'bg-purple-400 shadow-purple-400/60',
  Expired:     'bg-red-500 shadow-red-500/60',
};
const STATUS_TEXT = {
  Available:   'text-green-400',
  Waiting:     'text-yellow-400',
  Running:     'text-blue-400',
  Paused:      'text-orange-400',
  Offline:     'text-gray-500',
  Online:      'text-green-300',
  Maintenance: 'text-red-400',
  Reserved:    'text-purple-400',
  Expired:     'text-red-400',
};

export default function DeviceCard({ device, onNewSession, notResponding }) {
  const dot  = STATUS_DOT[device.status]  || 'bg-gray-500';
  const text = STATUS_TEXT[device.status] || 'text-white/40';

  // Display type + capacity generically — no hardcoded type names
  const typeLabel = device.type
    ? device.capacity
      ? `${device.type} · Cap: ${device.capacity}`
      : device.type
    : '—';

  return (
    <div className="glass p-4 flex flex-col gap-3 hover:bg-white/[0.07] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white text-sm">{device.label || device.name}</p>
          <p className="text-xs text-white/30 mt-0.5 uppercase tracking-wide">{typeLabel}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${text}`}>
          <span className={`w-2 h-2 rounded-full shadow-sm ${dot}`} />
          {device.status}
        </span>
      </div>

      {notResponding && (
        <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5 font-medium">
          ⚠ Not responding
        </div>
      )}

      {device.status === 'Available' && (
        <button onClick={() => onNewSession(device)} className="w-full text-xs btn-primary py-2">
          + New Session
        </button>
      )}
      {device.status === 'Maintenance' && (
        <p className="text-xs text-center text-red-400/70 font-medium py-1">🔧 Under Maintenance</p>
      )}
      {device.status === 'Offline' && (
        <p className="text-xs text-center text-white/20 py-1">Device offline</p>
      )}
      {device.status === 'Reserved' && (
        <p className="text-xs text-center text-purple-400/70 font-medium py-1">🔒 Reserved</p>
      )}
    </div>
  );
}
