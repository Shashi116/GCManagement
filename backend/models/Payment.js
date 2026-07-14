const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    amount:  { type: Number, required: true, min: 0 },
    method:  { type: String, enum: ['cash', 'upi'], required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('Payment', paymentSchema);
