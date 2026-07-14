const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const User    = require('../models/User');
const Device  = require('../models/Device');

// GET /api/setup/status — tells frontend whether setup has been done
router.get('/status', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ success: true, data: { setupRequired: count === 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/setup — one-time setup, locked forever once any user exists
router.post('/', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return res.status(403).json({ success: false, message: 'Setup already completed' });
    }

    const { name, username, password, devices = [] } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'name, username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, username: username.toLowerCase(), passwordHash, role: 'admin' });

    if (devices.length > 0) {
      await Device.insertMany(
        devices.map((d) => ({
          name:     d.name,
          type:     d.type,           // 'pc' | 'ps5'
          status:   'available',
          capacity: d.capacity || null,
        }))
      );
    }

    res.status(201).json({ success: true, message: 'Setup complete. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
