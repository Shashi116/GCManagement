const router  = require('express').Router();
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Device  = require('../models/Device');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/reports/daily?date=YYYY-MM-DD  (defaults to today)
// Returns total revenue, cash total, UPI total, session count for the day
router.get('/daily', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const dateStr = req.query.date;
    const day     = dateStr ? new Date(dateStr) : new Date();

    // Build start-of-day / end-of-day in local time
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    // Payments created today
    const payments = await Payment.find({ createdAt: { $gte: start, $lte: end } });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const cashTotal    = payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const upiTotal     = payments.filter((p) => p.method === 'upi').reduce((sum, p) => sum + p.amount, 0);

    // Sessions created today (ended or expired = completed)
    const totalSessions = await Session.countDocuments({ createdAt: { $gte: start, $lte: end } });

    return res.json({
      success: true,
      data: {
        date: start.toISOString().split('T')[0],
        totalRevenue,
        cashTotal,
        upiTotal,
        totalSessions,
        paymentCount: payments.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/usage
// Returns session count per device (all time), sorted by count desc
router.get('/usage', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const usage = await Session.aggregate([
      { $group: { _id: '$device', sessionCount: { $sum: 1 } } },
      { $sort:  { sessionCount: -1 } },
      {
        $lookup: {
          from:         'devices',
          localField:   '_id',
          foreignField: '_id',
          as:           'device',
        },
      },
      { $unwind: '$device' },
      {
        $project: {
          _id:          0,
          deviceId:     '$_id',
          deviceName:   '$device.name',
          deviceType:   '$device.type',
          sessionCount: 1,
        },
      },
    ]);

    return res.json({ success: true, data: usage });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
