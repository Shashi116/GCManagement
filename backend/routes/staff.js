const router = require('express').Router();
const bcrypt = require('bcrypt');
const User   = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const guard = [authenticateToken, requireRole('admin')];

// GET /api/staff
router.get('/', guard, async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }, '-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/staff
router.post('/', guard, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password)
      return res.status(400).json({ success: false, message: 'name, username and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username: username.toLowerCase(), passwordHash, role: 'staff' });

    res.status(201).json({
      success: true,
      data: { _id: user._id, name: user.name, username: user.username, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/staff/:id
router.delete('/:id', guard, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target)
      return res.status(404).json({ success: false, message: 'User not found' });
    if (target.role === 'admin')
      return res.status(403).json({ success: false, message: 'Cannot delete an admin account' });
    if (target._id.toString() === req.user.id)
      return res.status(403).json({ success: false, message: 'Cannot delete your own account' });

    await target.deleteOne();
    res.json({ success: true, message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
