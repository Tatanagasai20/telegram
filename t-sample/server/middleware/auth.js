const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is HR or admin
const hrMiddleware = (req, res, next) => {
  if (req.user.role !== 'hr' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. HR or admin role required' });
  }
  next();
};

// Middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required' });
  }
  next();
};

module.exports = { authMiddleware, hrMiddleware, adminMiddleware };