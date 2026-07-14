const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    device:          { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    customerName:    { type: String, required: true, trim: true },
    code:            { type: String, required: true, length: 6 },
    durationMinutes: { type: Number, required: true },
    remainingSeconds:{ type: Number, required: true },
    status:          {
      type: String,
      enum: ['waiting', 'running', 'paused', 'expired', 'ended'],
      default: 'waiting',
    },
    startedAt:       { type: Date, default: null },
    endedAt:         { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('Session', sessionSchema);
