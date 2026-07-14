/**
 * commandQueue.js
 * Manages device commands with delivery tracking and retry logic.
 *
 * - issueCommand(io, deviceId, type, payload) → creates Command doc, emits to device, marks sent
 * - Every 10s: finds commands still 'sent' after 15s with no ack
 *   - retryCount < 3 → resend, increment retryCount
 *   - retryCount >= 3 → mark 'timeout', emit COMMAND_FAILED
 */

const Command = require('../models/Command');

const RETRY_INTERVAL_MS = 10_000;
const TIMEOUT_MS        = 15_000;
const MAX_RETRIES       = 3;

let _io    = null;
let _timer = null;

async function issueCommand(io, deviceId, type, payload = null) {
  const cmd = await Command.create({ deviceId, type, payload, status: 'pending' });

  const now = new Date();
  cmd.status = 'sent';
  cmd.sentAt = now;
  await cmd.save();

  io.emit('COMMAND_ISSUED', {
    commandId: cmd._id.toString(),
    deviceId:  deviceId.toString(),
    type,
    payload,
  });

  return cmd;
}

async function retryLoop() {
  const cutoff = new Date(Date.now() - TIMEOUT_MS);

  const stale = await Command.find({
    status:  'sent',
    sentAt:  { $lt: cutoff },
  });

  for (const cmd of stale) {
    if (cmd.retryCount >= MAX_RETRIES) {
      cmd.status = 'timeout';
      await cmd.save();

      _io.emit('COMMAND_FAILED', {
        commandId: cmd._id.toString(),
        deviceId:  cmd.deviceId.toString(),
        type:      cmd.type,
      });
    } else {
      cmd.retryCount += 1;
      cmd.sentAt      = new Date();
      await cmd.save();

      _io.emit('COMMAND_ISSUED', {
        commandId: cmd._id.toString(),
        deviceId:  cmd.deviceId.toString(),
        type:      cmd.type,
        payload:   cmd.payload,
      });
    }
  }
}

function start(io) {
  _io    = io;
  _timer = setInterval(() => retryLoop().catch(console.error), RETRY_INTERVAL_MS);
  console.log('📋 Command queue started');
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { start, stop, issueCommand };
