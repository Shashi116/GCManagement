const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token)
    return res.status(401).json({ success: false, message: 'Access token required' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, message });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role)
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    next();
  };
}

/**
 * Verifies a device-scoped JWT (type: 'device').
 * Attaches decoded payload to req.device on success.
 * Completely separate from user tokens — different secret, different payload shape.
 */
function authenticateDevice(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token)
    return res.status(401).json({ success: false, message: 'Device token required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_DEVICE_SECRET);
    if (payload.type !== 'device')
      return res.status(403).json({ success: false, message: 'Invalid token type' });
    req.device = payload;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Device token expired' : 'Invalid device token';
    return res.status(401).json({ success: false, message });
  }
}

module.exports = { authenticateToken, requireRole, authenticateDevice };
