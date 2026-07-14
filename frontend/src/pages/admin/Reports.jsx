import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../api/axios';
import Spinner from '../../components/Spinner';
import ErrorBanner from '../../components/ErrorBanner';

// TODO: replace with real date picker in Stage 2
const PIE_COLORS  = ['#4ade80', '#60a5fa'];
const CHART_TOOLTIP = {
  contentStyle: {
    background: 'rgba(15,15,30,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    fontSize: 12,
    color: '#fff',
  },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};
const AXIS_TICK   = { fill: 'rgba(255,255,255,0.3)', fontSize: 11 };
const GRID_STROKE = 'rgba(255,255,255,0.05)';

function StatCard({ label, value, sub, glow }) {
  return (
    <div className="glass p-5 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${glow}`} />
      <p className="text-xs text-white/40 font-medium">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const [daily, setDaily]     = useState(null);
  const [usage, setUsage]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    // TODO: replace with GET /api/reports/daily and GET /api/reports/usage
    Promise.all([
      api.get('/reports/daily'),
      api.get('/reports/usage'),
    ])
      .then(([dailyRes, usageRes]) => {
        setDaily(dailyRes.data.data);
        setUsage(usageRes.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalRevenue = daily?.totalRevenue  || 0;
  const cashTotal    = daily?.cashTotal     || 0;
  const upiTotal     = daily?.upiTotal      || 0;
  const totalSessions = daily?.totalSessions || 0;

  const pieData = [
    { name: 'Cash', value: cashTotal },
    { name: 'UPI',  value: upiTotal  },
  ];

  // Usage data shaped for recharts
  const usageChart = usage.map((u) => ({
    label:    u.deviceName,
    sessions: u.sessionCount,
  }));

  const mostUsed = usage[0]?.deviceName || '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <span className="text-xs text-white/30 glass px-3 py-1.5 rounded-lg">
          Today · live data
        </span>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Daily Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          sub={`${totalSessions} sessions`}
          glow="bg-indigo-500"
        />
        <StatCard
          label="Cash Collected"
          value={`₹${cashTotal.toLocaleString()}`}
          sub={totalRevenue ? `${Math.round((cashTotal / totalRevenue) * 100)}% of total` : '—'}
          glow="bg-green-500"
        />
        <StatCard
          label="UPI Collected"
          value={`₹${upiTotal.toLocaleString()}`}
          sub={totalRevenue ? `${Math.round((upiTotal / totalRevenue) * 100)}% of total` : '—'}
          glow="bg-blue-500"
        />
        <StatCard
          label="Most Used"
          value={mostUsed}
          sub="device (all time)"
          glow="bg-purple-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Device usage bar */}
        <div className="lg:col-span-2 glass p-5">
          <h3 className="text-sm font-semibold text-white/60 mb-4">Device Usage — Total Sessions</h3>
          {usageChart.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-10">No session data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usageChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v} sessions`, 'Sessions']} />
                <Bar dataKey="sessions" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cash vs UPI pie */}
        <div className="glass p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white/60 mb-4">Cash vs UPI Split</h3>
          <div className="flex-1 flex items-center justify-center">
            {totalRevenue === 0 ? (
              <p className="text-white/20 text-sm">No payments today.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`₹${v.toLocaleString()}`, '']}
                    contentStyle={CHART_TOOLTIP.contentStyle}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-white/60 mb-4">Today's Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}` },
            { label: 'Cash',          value: `₹${cashTotal.toLocaleString()}` },
            { label: 'UPI',           value: `₹${upiTotal.toLocaleString()}` },
            { label: 'Sessions',      value: totalSessions },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] rounded-xl py-3 px-2">
              <p className="text-xs text-white/30 mb-1">{label}</p>
              <p className="text-lg font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
