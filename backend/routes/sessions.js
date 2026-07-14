const router  = require('express').Router();
const Session = require('../models/Session');
const Device  = require('../models/Device');
const { authenticateToken } = require('../middleware/auth');
const timer        = require('../services/sessionTimer');
const commandQueue = require('../services/commandQueue');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function emit(req, event, payload) {
  req.app.get('io')?.emit(event, payload);
}

// GET /api/sessions/active
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({
      status: { $nin: ['ended', 'expired'] },
    }).populate('device', 'name type status capacity');
    return res.json({ success: true, data: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sessions
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { deviceId, customerName, durationMinutes } = req.body;
    if (!deviceId || !customerName || !durationMinutes)
      return res.status(400).json({ success: false, message: 'deviceId, customerName and durationMinutes are required' });

    const device = await Device.findById(deviceId);
    if (!device)
      return res.status(404).json({ success: false, message: 'Device not found' });
    if (device.status !== 'available')
      return res.status(400).json({ success: false, message: `Device is not available (current status: ${device.status})` });

    const code    = generateCode();
    const session = await Session.create({
      device: deviceId, customerName, code,
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
      status: 'waiting',
    });

    await Device.findByIdAndUpdate(deviceId, { status: 'waiting' });

    // Capture deviceId as string before populate mutates session.device
    const devId     = session.device.toString();
    const populated = await session.populate('device', 'name type status capacity');

    emit(req, 'SESSION_CREATED', { session: populated, deviceId: devId });
    emit(req, 'DEVICE_STATUS_CHANGED', { deviceId: devId, status: 'waiting' });

    return res.status(201).json({ success: true, message: 'Session created', data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sessions/:id/verify-code
router.post('/:id/verify-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code)
      return res.status(400).json({ success: false, message: 'code is required' });

    const session = await Session.findById(req.params.id);
    if (!session)
      return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'waiting')
      return res.status(400).json({ success: false, message: `Session is already ${session.status}` });
    if (session.code !== String(code))
      return res.status(400).json({ success: false, message: 'Incorrect code' });

    session.status    = 'running';
    session.startedAt = new Date();
    await session.save();

    await Device.findByIdAndUpdate(session.device, { status: 'running' });

    // Capture deviceId before populate mutates session.device into an object
    const deviceId   = session.device.toString();
    const populated  = await session.populate('device', 'name type status capacity');

    // Register with timer — countdown begins now
    timer.addSession(session._id, session.remainingSeconds);

    emit(req, 'CODE_VERIFIED',         { sessionId: session._id.toString(), deviceId });
    emit(req, 'SESSION_STARTED',       { session: populated, deviceId });
    emit(req, 'DEVICE_STATUS_CHANGED', { deviceId, status: 'running' });

    // Issue UNLOCK command so the Agent knows to unblock the device
    await commandQueue.issueCommand(req.app.get('io'), deviceId, 'UNLOCK', { remainingSeconds: session.remainingSeconds });

    return res.json({ success: true, message: 'Code verified — session is now running', data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/sessions/:id/pause
router.patch('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session)
      return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'running')
      return res.status(400).json({ success: false, message: 'Only running sessions can be paused' });

    session.status = 'paused';
    await session.save();
    await Device.findByIdAndUpdate(session.device, { status: 'paused' });

    const deviceId = session.device.toString();
    timer.removeSession(session._id);

    emit(req, 'SESSION_PAUSED',        { sessionId: session._id.toString(), deviceId });
    emit(req, 'DEVICE_STATUS_CHANGED', { deviceId, status: 'paused' });

    return res.json({ success: true, message: 'Session paused', data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/sessions/:id/resume
router.patch('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session)
      return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'paused')
      return res.status(400).json({ success: false, message: 'Only paused sessions can be resumed' });

    session.status = 'running';
    await session.save();
    await Device.findByIdAndUpdate(session.device, { status: 'running' });

    const deviceId = session.device.toString();
    timer.addSession(session._id, session.remainingSeconds);

    emit(req, 'SESSION_RESUMED',       { sessionId: session._id.toString(), deviceId });
    emit(req, 'DEVICE_STATUS_CHANGED', { deviceId, status: 'running' });

    return res.json({ success: true, message: 'Session resumed', data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/sessions/:id/extend
router.patch('/:id/extend', authenticateToken, async (req, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes || minutes < 1)
      return res.status(400).json({ success: false, message: 'minutes must be a positive number' });

    const session = await Session.findById(req.params.id);
    if (!session)
      return res.status(404).json({ success: false, message: 'Session not found' });
    if (!['running', 'paused'].includes(session.status))
      return res.status(400).json({ success: false, message: 'Can only extend running or paused sessions' });

    session.durationMinutes  += Number(minutes);
    session.remainingSeconds += Number(minutes) * 60;
    await session.save();

    // Sync timer with new remaining value
    timer.updateRemaining(session._id, session.remainingSeconds);

    const deviceId = session.device.toString();
    emit(req, 'SESSION_EXTENDED', {
      sessionId:        session._id.toString(),
      deviceId,
      remainingSeconds: session.remainingSeconds,
      durationMinutes:  session.durationMinutes,
    });

    return res.json({ success: true, message: `Session extended by ${minutes} min`, data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/sessions/:id/end
router.patch('/:id/end', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session)
      return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status === 'ended')
      return res.status(400).json({ success: false, message: 'Session is already ended' });

    session.status  = 'ended';
    session.endedAt = new Date();
    await session.save();

    await Device.findByIdAndUpdate(session.device, { status: 'available' });

    const deviceId = session.device.toString();
    timer.removeSession(session._id);

    emit(req, 'SESSION_ENDED',         { sessionId: session._id.toString(), deviceId });
    emit(req, 'DEVICE_STATUS_CHANGED', { deviceId, status: 'available' });

    // Issue LOCK command so the Agent locks the device after session ends
    await commandQueue.issueCommand(req.app.get('io'), deviceId, 'LOCK');

    return res.json({ success: true, message: 'Session ended', data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
