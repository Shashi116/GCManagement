const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    type:             { type: String, required: true, trim: true, lowercase: true },
    status:           {
      type: String,
      enum: ['available', 'waiting', 'running', 'paused', 'offline', 'online', 'maintenance', 'reserved', 'expired'],
      default: 'available',
    },
    capacity:         { type: Number, default: null },
    deviceSecretHash: { type: String, default: null },  // bcrypt hash of the one-time secret
    lastSeenAt:       { type: Date,   default: null },
    agentVersion:     { type: String, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('Device', deviceSchema);
