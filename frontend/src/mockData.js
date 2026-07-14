// TODO: replace all mock data with real API responses in Stage 2

export const DEVICE_STATUSES = {
  AVAILABLE: 'Available',
  WAITING_CODE: 'Waiting For Code',
  RUNNING: 'Running',
  PAUSED: 'Paused',
  OFFLINE: 'Offline',
  MAINTENANCE: 'Maintenance',
  RESERVED: 'Reserved',
  EXPIRED: 'Expired',
};

// Session lifecycle: waiting → running → paused → running → ended/expired
export const SESSION_STATES = {
  WAITING: 'waiting',   // code generated, not yet entered on PC
  RUNNING: 'running',
  PAUSED: 'paused',
  EXPIRED: 'expired',
  ENDED: 'ended',
};

export const STATUS_COLORS = {
  Available:          'bg-green-500',
  'Waiting For Code': 'bg-yellow-400',
  Running:            'bg-blue-500',
  Paused:             'bg-orange-400',
  Offline:            'bg-gray-500',
  Maintenance:        'bg-red-500',
  Reserved:           'bg-purple-500',
  Expired:            'bg-red-600',
};

export const STATUS_TEXT_COLORS = {
  Available:          'text-green-600',
  'Waiting For Code': 'text-yellow-600',
  Running:            'text-blue-600',
  Paused:             'text-orange-500',
  Offline:            'text-gray-500',
  Maintenance:        'text-red-600',
  Reserved:           'text-purple-600',
  Expired:            'text-red-600',
};

// TODO: replace with GET /api/devices
export const initialDevices = [
  { id: 'd1', type: 'PC', label: 'PC 1', status: 'Available' },
  { id: 'd2', type: 'PC', label: 'PC 2', status: 'Running' },
  { id: 'd3', type: 'PC', label: 'PC 3', status: 'Paused' },
  { id: 'd4', type: 'PC', label: 'PC 4', status: 'Maintenance' },
  { id: 'd5', type: 'PC', label: 'PC 5', status: 'Available' },
  { id: 'd6', type: 'PC', label: 'PC 6', status: 'Offline' },
  { id: 'd7', type: 'PS5', label: 'PS5 Room 1', status: 'Available', capacity: 2 },
  { id: 'd8', type: 'PS5', label: 'PS5 Room 2', status: 'Running', capacity: 4 },
];

// TODO: replace with GET /api/sessions
export const initialSessions = [
  {
    id: 's1',
    deviceId: 'd2',
    customerName: 'Rahul',
    duration: 60,
    remainingSeconds: 2340,
    paymentMethod: 'Cash',
    amount: 60,
    code: '482910',
    sessionState: 'running',
    startedAt: Date.now() - 20 * 60 * 1000,
  },
  {
    id: 's2',
    deviceId: 'd3',
    customerName: 'Priya',
    duration: 30,
    remainingSeconds: 900,
    paymentMethod: 'UPI',
    amount: 30,
    code: '773421',
    sessionState: 'paused',
    startedAt: Date.now() - 15 * 60 * 1000,
  },
  {
    id: 's3',
    deviceId: 'd8',
    customerName: 'Arjun',
    duration: 90,
    remainingSeconds: 3600,
    paymentMethod: 'Cash',
    amount: 120,
    code: '991234',
    sessionState: 'running',
    startedAt: Date.now() - 30 * 60 * 1000,
  },
];

// TODO: replace with GET /api/staff
export const initialStaff = [
  { id: 'u1', name: 'Amit Kumar', role: 'Staff' },
  { id: 'u2', name: 'Sneha Rao', role: 'Staff' },
];

// TODO: replace with GET /api/reports/daily
export const mockReports = {
  dailyRevenue: 3240,
  cashTotal: 1980,
  upiTotal: 1260,
  mostUsedDevice: 'PC 2',
  totalSessions: 18,
  peakHours: [
    { hour: '10am', sessions: 2 },
    { hour: '12pm', sessions: 4 },
    { hour: '2pm', sessions: 6 },
    { hour: '4pm', sessions: 8 },
    { hour: '6pm', sessions: 7 },
    { hour: '8pm', sessions: 5 },
    { hour: '10pm', sessions: 3 },
  ],
  deviceUsage: [
    { label: 'PC 1', sessions: 3 },
    { label: 'PC 2', sessions: 5 },
    { label: 'PC 3', sessions: 4 },
    { label: 'PC 4', sessions: 2 },
    { label: 'PC 5', sessions: 3 },
    { label: 'PC 6', sessions: 1 },
    { label: 'PS5 Room 1', sessions: 4 },
    { label: 'PS5 Room 2', sessions: 3 },
  ],
};
