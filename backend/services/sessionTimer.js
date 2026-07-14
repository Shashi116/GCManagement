/**
 * sessionTimer.js
 * Owns the server-side countdown for all running sessions.
 *
 * - Loads all running sessions from DB on start
 * - Ticks remainingSeconds every 1 second in memory
 * - Flushes changes to DB + emits REMAINING_TIME_TICK every 5 seconds
 * - Emits SESSION_EXPIRED + DEVICE_STATUS_CHANGED when a session hits 0
 */

const Session      = require('../models/Session');
const Device       = require('../models/Device');
const commandQueue = require('./commandQueue');

// in-memory map: sessionId (string) → remainingSeconds (number)
const ticks = new Map();

let _io    = null;
let _tick  = 0;
let _timer = null;

async function loadRunning() {
  const running = await Session.find({ status: 'running' }, '_id remainingSeconds');
  ticks.clear();
  running.forEach((s) => ticks.set(s._id.toString(), s.remainingSeconds));
}

async function expireSession(sid) {
  ticks.delete(sid);
  const session = await Session.findByIdAndUpdate(
    sid,
    { status: 'expired', remainingSeconds: 0 },
    { returnDocument: 'after' }
  );
  if (!session) return;

  const device = await Device.findByIdAndUpdate(
    session.device,
    { status: 'expired' },
    { returnDocument: 'after' }
  );

  _io.emit('SESSION_EXPIRED', { sessionId: sid, deviceId: session.device?.toString() });
  if (device) {
    _io.emit('DEVICE_STATUS_CHANGED', { deviceId: device._id.toString(), status: device.status });
  }

  // Issue LOCK command on expiry
  await commandQueue.issueCommand(_io, session.device, 'LOCK');
}

async function flushToDB() {
  if (ticks.size === 0) return;
  const ops = [];
  ticks.forEach((remaining, sid) => {
    ops.push({ updateOne: { filter: { _id: sid }, update: { $set: { remainingSeconds: remaining } } } });
  });
  await Session.bulkWrite(ops).catch(() => {});
}

function onTick() {
  _tick += 1;

  const expired = [];
  ticks.forEach((remaining, sid) => {
    const next = remaining - 1;
    if (next <= 0) expired.push(sid);
    else ticks.set(sid, next);
  });

  expired.forEach((sid) => expireSession(sid).catch(console.error));

  if (_tick % 5 === 0) {
    flushToDB().catch(console.error);
    if (ticks.size > 0) {
      const payload = [];
      ticks.forEach((remainingSeconds, sessionId) => payload.push({ sessionId, remainingSeconds }));
      _io.emit('REMAINING_TIME_TICK', payload);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

function addSession(sid, remainingSeconds) {
  ticks.set(sid.toString(), remainingSeconds);
}

function removeSession(sid) {
  ticks.delete(sid.toString());
}

function updateRemaining(sid, remainingSeconds) {
  ticks.set(sid.toString(), remainingSeconds);
}

async function start(io) {
  _io = io;
  await loadRunning();
  _timer = setInterval(onTick, 1000);
  console.log(`⏱  Session timer started (${ticks.size} running sessions loaded)`);
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { start, stop, addSession, removeSession, updateRemaining };
