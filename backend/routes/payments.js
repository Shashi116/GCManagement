const router  = require('express').Router();
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');

// POST /api/payments
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { sessionId, amount, method } = req.body;

    if (!sessionId || amount == null || !method) {
      return res.status(400).json({
        success: false,
        message: 'sessionId, amount and method are required',
      });
    }
    if (!['cash', 'upi'].includes(method)) {
      return res.status(400).json({ success: false, message: 'method must be cash or upi' });
    }
    if (amount < 0) {
      return res.status(400).json({ success: false, message: 'amount must be non-negative' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const payment = await Payment.create({ session: sessionId, amount, method });

    return res.status(201).json({ success: true, message: 'Payment recorded', data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
