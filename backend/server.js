require('dotenv').config();

const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const mongoose  = require('mongoose');
const { Server } = require('socket.io');

// ── Services ─────────────────────────────────────────────────────────────────
const sessionTimer   = require('./services/sessionTimer');
const commandQueue   = require('./services/commandQueue');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const setupRoutes    = require('./routes/setup');
const staffRoutes    = require('./routes/staff');
const deviceRoutes   = require('./routes/devices');
const sessionRoutes  = require('./routes/sessions');
const paymentRoutes  = require('./routes/payments');
const reportRoutes   = require('./routes/reports');

// ── App + HTTP server ─────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.IO — initialized here, events wired in Stage 3 ────────────────────
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Attach io to app so routes can emit events later (Stage 3)
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'GC Management API is running', timestamp: new Date() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/setup',    setupRoutes);
app.use('/api/staff',    staffRoutes);
app.use('/api/devices',  deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports',  reportRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── MongoDB connection + server start ─────────────────────────────────────────
const PORT      = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { family: 4 })
  .then(() => {
    console.log('✅ MongoDB connected:', MONGO_URI);
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO ready on http://localhost:${PORT}`);
      sessionTimer.start(io);
      commandQueue.start(io);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
