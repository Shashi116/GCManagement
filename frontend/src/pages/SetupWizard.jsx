import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const STEPS = ['Admin Account', 'Devices', 'UPI QR', 'Finish'];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all whitespace-nowrap">
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

const EMPTY_DEVICE = { name: '', type: 'pc', capacity: '' };

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [createdDevices, setCreatedDevices] = useState(null);

  // Step 1 — admin
  const [adminName, setAdminName]         = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPass, setConfirmPass]     = useState('');
  const [showPass, setShowPass]           = useState(false);

  // Step 2 — devices (generic list)
  const [deviceList, setDeviceList] = useState([{ ...EMPTY_DEVICE, name: 'PC 1', type: 'pc' }]);

  const addDevice    = () => setDeviceList((p) => [...p, { ...EMPTY_DEVICE }]);
  const removeDevice = (i) => setDeviceList((p) => p.filter((_, idx) => idx !== i));
  const updateDevice = (i, patch) => setDeviceList((p) => p.map((d, idx) => idx === i ? { ...d, ...patch } : d));

  // Step 3 — UPI QR
  const [qrPreview, setQrPreview] = useState(null);
  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setQrPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const canAdvance = () => {
    if (step === 1) return (
      adminName.trim() &&
      adminUsername.trim().length >= 3 &&
      adminPassword.length >= 6 &&
      adminPassword === confirmPass
    );
    if (step === 2) return deviceList.every((d) => d.name.trim() && d.type.trim());
    return true;
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const devices = deviceList.map((d) => ({
        name:     d.name.trim(),
        type:     d.type.trim().toLowerCase(),
        capacity: d.capacity ? Number(d.capacity) : null,
      }));
      const { data } = await api.post('/setup', {
        name: adminName, username: adminUsername, password: adminPassword, devices,
      });
      setCreatedDevices(data.data?.devices || []);
      setStep(5); // credentials screen
    } catch (err) {
      setError(err.response?.data?.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Credentials screen
  if (step === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-600/10 rounded-full blur-3xl" />
        </div>
        <div className="glass-md shadow-2xl shadow-black/50 w-full max-w-2xl relative p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl">🎉</div>
            <div>
              <h2 className="text-xl font-bold text-white">Setup Complete!</h2>
              <p className="text-sm text-white/40">Save these credentials — each device needs them to connect</p>
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400 mb-5">
            ⚠ These secrets are shown <strong>once only</strong> and cannot be recovered.
          </div>
          {createdDevices && createdDevices.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {createdDevices.map((d) => (
                <div key={d._id} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
                  <p className="font-semibold text-white text-sm mb-3 uppercase tracking-wide">
                    {d.type} · {d.name}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30 w-24 shrink-0">Device ID</span>
                      <code className="flex-1 font-mono text-xs text-indigo-300 bg-black/20 px-2 py-1 rounded truncate">{d._id}</code>
                      <CopyButton text={d._id} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30 w-24 shrink-0">Secret</span>
                      <code className="flex-1 font-mono text-xs text-green-300 bg-black/20 px-2 py-1 rounded truncate">{d.deviceSecret}</code>
                      <CopyButton text={d.deviceSecret} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-6">No devices added. Add them via Admin → Devices.</p>
          )}
          <button onClick={() => navigate('/login')} className="btn-primary w-full py-2.5 text-sm mt-5">
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="glass-md shadow-2xl shadow-black/50 w-full max-w-lg relative">

        {/* Step indicator */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i + 1 < step ? 'bg-green-500/80 text-white'
                    : i + 1 === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                    : 'bg-white/5 border border-white/10 text-white/30'
                  }`}>
                    {i + 1 < step ? '✓' : i + 1}
                  </div>
                  <span className="text-xs text-white/25 hidden sm:block whitespace-nowrap">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 mb-4 transition-colors ${i + 1 < step ? 'bg-green-500/40' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-6 min-h-[320px]">

          {/* Step 1: Admin Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Create Admin Account</h2>
                <p className="text-sm text-white/30 mt-0.5">This is the only admin — choose credentials carefully</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Your Name</label>
                <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Café Owner Name" className="glass-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Username (min 3 chars)</label>
                <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="admin_username" className="glass-input" autoComplete="username" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Password (min 6 chars)</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Set a strong password" className="glass-input pr-16" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60 transition-colors">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1">Confirm Password</label>
                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-enter password"
                  className={`glass-input ${confirmPass && confirmPass !== adminPassword ? 'border-red-500/50' : ''}`}
                  autoComplete="new-password" />
                {confirmPass && confirmPass !== adminPassword && <p className="text-xs text-red-400 mt-1">Passwords do not match</p>}
              </div>
            </div>
          )}

          {/* Step 2: Devices — generic, any type */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Devices</h2>
                  <p className="text-sm text-white/30 mt-0.5">Any type — PC, PS5, VR, console, etc.</p>
                </div>
                <button onClick={addDevice}
                  className="text-sm text-indigo-400 hover:text-indigo-300 font-medium border border-indigo-500/30 px-3 py-1 rounded-lg bg-indigo-500/10 transition-all">
                  + Add
                </button>
              </div>
              {deviceList.length === 0 && (
                <p className="text-sm text-white/20 text-center py-4">No devices — click "+ Add"</p>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {deviceList.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={d.name} onChange={(e) => updateDevice(i, { name: e.target.value })}
                      placeholder="Name (e.g. PC 1)" className="flex-1 glass-input" />
                    <input value={d.type} onChange={(e) => updateDevice(i, { type: e.target.value })}
                      placeholder="Type" className="w-20 glass-input" list="setup-types" />
                    <datalist id="setup-types">
                      {['pc', 'ps5', 'vr', 'console'].map((t) => <option key={t} value={t} />)}
                    </datalist>
                    <input type="number" min="1" value={d.capacity} onChange={(e) => updateDevice(i, { capacity: e.target.value })}
                      placeholder="Cap" title="Capacity (optional)" className="w-14 glass-input text-center px-1" />
                    <button onClick={() => removeDevice(i)}
                      className="w-8 h-8 flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-lg leading-none">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/20">Name · Type · Capacity (optional)</p>
            </div>
          )}

          {/* Step 3: UPI QR */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Upload UPI QR Code</h2>
                <p className="text-sm text-white/30 mt-0.5">Shown to customers when they pay via UPI</p>
              </div>
              <label className="block border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl p-6 text-center cursor-pointer transition-all">
                {qrPreview ? (
                  <div>
                    <img src={qrPreview} alt="UPI QR" className="mx-auto max-h-40 rounded-xl mb-2 border border-white/10" />
                    <p className="text-xs text-indigo-400">Click to change</p>
                  </div>
                ) : (
                  <div className="text-white/20 space-y-2">
                    <div className="text-4xl">📷</div>
                    <p className="text-sm font-medium text-white/40">Click to upload QR image</p>
                    <p className="text-xs">PNG, JPG supported</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
              </label>
              <p className="text-xs text-white/20 text-center">You can skip this and add it later from Admin settings</p>
            </div>
          )}

          {/* Step 4: Finish */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Ready to Go! 🎉</h2>
                <p className="text-sm text-white/30 mt-0.5">Review your setup before finishing</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3 text-sm">
                {[
                  ['Admin Name', adminName || '—'],
                  ['Username',   adminUsername || '—'],
                  ['Devices',    `${deviceList.length} device${deviceList.length !== 1 ? 's' : ''}`],
                  ['UPI QR',     qrPreview ? '✓ Uploaded' : 'Not set'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-white/30">{label}</span>
                    <span className={`font-medium ${label === 'UPI QR' && qrPreview ? 'text-green-400' : 'text-white/70'}`}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 text-xs text-indigo-400 space-y-0.5">
                {deviceList.map((d, i) => (
                  <p key={i}>{d.name} <span className="text-indigo-300/50 uppercase">{d.type}</span>{d.capacity ? ` · cap ${d.capacity}` : ''}</p>
                ))}
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400">
                ⚠ After finishing, device credentials will be shown <strong>once</strong>. Have a pen or phone ready.
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400">{error}</div>}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex justify-between items-center border-t border-white/[0.06] pt-5">
          <button onClick={() => setStep((s) => s - 1)} disabled={step === 1 || loading}
            className="px-5 py-2 text-sm text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors">
            ← Back
          </button>
          {step < 4 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}
              className="btn-primary px-6 py-2.5 text-sm disabled:opacity-30">
              Next →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={loading}
              className="bg-green-600/80 hover:bg-green-600 border border-green-500/40 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
              {loading ? 'Setting up…' : 'Finish Setup ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
