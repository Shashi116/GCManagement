const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const Device  = require('../models/Device');
const Session = require('../models/Session');
const Command = require('../models/Command');
const { authenticateToken, requireRole, authenticateDevice } = require('../middleware/auth');
const timer   = require('../services/sessionTimer');

function emit(req, event, payload) {
  req.app.get('io')?.emit(event, payload);
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

// GET /api/devices/types — distinct device types in DB, for frontend datalist
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const types = await Device.distinct('type');
    return res.json({ success: true, data: types.sort() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/devices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({}, '-deviceSecretHash').sort({ createdAt: 1 });
    return res.json({ success: true, data: devices });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices — admin only; creates device + returns plain secret ONCE
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, type, status, capacity } = req.body;
    if (!name || !type)
      return res.status(400).json({ success: false, message: 'name and type are required' });

    const normType = type.trim().toLowerCase();
    if (!normType)
      return res.status(400).json({ success: false, message: 'type cannot be empty' });

    const deviceSecret     = crypto.randomBytes(32).toString('hex');
    const deviceSecretHash = await bcrypt.hash(deviceSecret, 10);

    const device = await Device.create({
      name,
      type:     normType,
      status:   status || 'available',
      capacity: capacity || null,
      deviceSecretHash,
    });

    return res.status(201).json({
      success: true,
      message: 'Device created',
      data: {
        _id:          device._id,
        name:         device.name,
        type:         device.type,
        status:       device.status,
        capacity:     device.capacity,
        createdAt:    device.createdAt,
        // Plain secret returned ONCE — not stored in plain text anywhere
        deviceSecret,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/devices/:id — admin only
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, type, status, capacity } = req.body;
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { name, type: type?.trim().toLowerCase(), status, capacity },
      { runValidators: true }
    );
    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });
    const updated = await Device.findById(req.params.id, '-deviceSecretHash');
    return res.json({ success: true, message: 'Device updated', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/devices/:id — admin only
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });
    return res.json({ success: true, message: 'Device deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Device authentication ─────────────────────────────────────────────────────

// POST /api/devices/authenticate — called by Agent on startup with saved deviceId + deviceSecret
router.post('/authenticate', async (req, res) => {
  try {
    const { deviceId, deviceSecret } = req.body;

    console.log('[device/authenticate] content-type:', req.headers['content-type']);
    console.log('[device/authenticate] body received — deviceId:', deviceId, '| deviceSecret present:', !!deviceSecret);

    if (!deviceId || !deviceSecret) {
      console.log('[device/authenticate] missing fields — deviceId:', !!deviceId, '| deviceSecret:', !!deviceSecret);
      return res.status(400).json({ success: false, message: 'deviceId and deviceSecret are required' });
    }

    const device = await Device.findById(deviceId).catch(() => null);
    if (!device) {
      console.log('[device/authenticate] Device not found:', deviceId);
      return res.status(400).json({ success: false, message: 'Device not found. Check the Device ID is copied from Admin → Devices.' });
    }
    if (!device.deviceSecretHash) {
      console.log('[device/authenticate] Device has no secret (created via Setup Wizard):', deviceId);
      return res.status(400).json({ success: false, message: 'Device has no credentials. Remove it and re-add it via Admin → Devices to generate a secret.' });
    }

    const match = await bcrypt.compare(deviceSecret, device.deviceSecretHash);
    if (!match) {
      console.log('[device/authenticate] Secret mismatch for device:', deviceId);
      return res.status(400).json({ success: false, message: 'Invalid device secret' });
    }

    const token = jwt.sign(
      { deviceId: device._id.toString(), type: 'device' },
      process.env.JWT_DEVICE_SECRET,
      { expiresIn: process.env.JWT_DEVICE_EXPIRES_IN || '30d' }
    );

    await Device.findByIdAndUpdate(deviceId, { lastSeenAt: new Date() });
    console.log('[device/authenticate] Success for device:', deviceId);

    return res.json({ success: true, message: 'Authenticated', data: { token, deviceId: device._id } });
  } catch (err) {
    console.error('[device/authenticate] Unexpected error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Device-scoped session routes (authenticateDevice) ─────────────────────────

// GET /api/devices/:deviceId/session — current active session for this device
router.get('/:deviceId/session', authenticateDevice, async (req, res) => {
  try {
    if (req.device.deviceId !== req.params.deviceId)
      return res.status(403).json({ success: false, message: 'Token does not match device' });

    const session = await Session.findOne({
      device: req.params.deviceId,
      status: { $in: ['waiting', 'running', 'paused'] },
    }).populate('device', 'name type status capacity');

    return res.json({ success: true, data: { session: session || null } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices/:deviceId/verify-code — Agent submits code entered by customer
router.post('/:deviceId/verify-code', authenticateDevice, async (req, res) => {
  try {
    if (req.device.deviceId !== req.params.deviceId)
      return res.status(403).json({ success: false, message: 'Token does not match device' });

    const { code } = req.body;
    if (!code)
      return res.status(400).json({ success: false, message: 'code is required' });

    const session = await Session.findOne({
      device: req.params.deviceId,
      status: 'waiting',
    });
    if (!session)
      return res.status(404).json({ success: false, message: 'No waiting session for this device' });
    if (session.code !== String(code))
      return res.status(400).json({ success: false, message: 'Incorrect code' });

    session.status    = 'running';
    session.startedAt = new Date();
    await session.save();

    await Device.findByIdAndUpdate(req.params.deviceId, { status: 'running' });

    // Capture deviceId before populate mutates session.device
    const deviceId  = req.params.deviceId;
    const populated = await session.populate('device', 'name type status capacity');

    timer.addSession(session._id, session.remainingSeconds);

    emit(req, 'CODE_VERIFIED',         { sessionId: session._id.toString(), deviceId });
    emit(req, 'SESSION_STARTED',       { session: populated, deviceId });
    emit(req, 'DEVICE_STATUS_CHANGED', { deviceId, status: 'running' });

    return res.json({ success: true, message: 'Code verified — session is now running', data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices/:deviceId/heartbeat — Agent pings every N seconds
router.post('/:deviceId/heartbeat', authenticateDevice, async (req, res) => {
  try {
    if (req.device.deviceId !== req.params.deviceId)
      return res.status(403).json({ success: false, message: 'Token does not match device' });

    const { status: rawStatus, agentVersion } = req.body;
    // Normalise 'online' from agent to 'available' — 'online' is not a meaningful session state
    const status = rawStatus === 'online' ? 'available' : rawStatus;

    const device = await Device.findById(req.params.deviceId);
    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });

    // Only update status if agent reports one AND the device isn't mid-session
    const sessionStatuses = ['waiting', 'running', 'paused', 'expired'];
    const statusChanged = status && status !== device.status && !sessionStatuses.includes(device.status);
    const update = { lastSeenAt: new Date() };
    if (agentVersion) update.agentVersion = agentVersion;
    if (statusChanged) update.status = status;

    await Device.findByIdAndUpdate(req.params.deviceId, update);

    if (statusChanged) {
      emit(req, 'DEVICE_STATUS_CHANGED', { deviceId: req.params.deviceId, status });
    }

    return res.json({ success: true, message: 'Heartbeat received' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices/:deviceId/commands/:commandId/ack — Agent acknowledges a command
router.post('/:deviceId/commands/:commandId/ack', authenticateDevice, async (req, res) => {
  try {
    if (req.device.deviceId !== req.params.deviceId)
      return res.status(403).json({ success: false, message: 'Token does not match device' });

    const { success, error } = req.body;
    const cmd = await Command.findOne({ _id: req.params.commandId, deviceId: req.params.deviceId });
    if (!cmd)
      return res.status(404).json({ success: false, message: 'Command not found' });
    if (['acknowledged', 'failed', 'timeout'].includes(cmd.status))
      return res.status(400).json({ success: false, message: 'Command already finalised' });

    cmd.status         = success ? 'acknowledged' : 'failed';
    cmd.acknowledgedAt = new Date();
    await cmd.save();

    emit(req, 'COMMAND_ACKED', {
      commandId: cmd._id.toString(),
      deviceId:  req.params.deviceId,
      type:      cmd.type,
      success:   !!success,
      error:     error || null,
    });

    return res.json({ success: true, message: 'Command acknowledged' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
