const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema(
  {
    deviceId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    type:           { type: String, enum: ['LOCK', 'UNLOCK', 'RESTART', 'SHUTDOWN'], required: true },
    status:         { type: String, enum: ['pending', 'sent', 'acknowledged', 'failed', 'timeout'], default: 'pending' },
    payload:        { type: mongoose.Schema.Types.Mixed, default: null },
    sentAt:         { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    retryCount:     { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('Command', commandSchema);
