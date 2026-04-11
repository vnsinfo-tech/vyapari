const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StaffRole = require('../models/StaffRole');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password').populate('business');
    if (!req.user) return res.status(401).json({ message: 'User not found' });

    // Attach staffRole permissions if not the business owner/admin
    if (req.user.business) {
      const staffRole = await StaffRole.findOne({
        user: req.user._id,
        business: req.user.business._id,
        isActive: true,
      });
      req.staffRole = staffRole || null;
    }

    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

// Check if the logged-in staff has a specific permission
// Business owner (admin who created the business) always passes
const checkPermission = (permission) => (req, res, next) => {
  // If user is the business owner, always allow
  if (req.user.business?.owner?.toString() === req.user._id.toString()) return next();
  // If no staffRole found, deny
  if (!req.staffRole) return res.status(403).json({ message: 'Access denied: no role assigned' });
  // Check the specific permission
  if (!req.staffRole.permissions[permission])
    return res.status(403).json({ message: `Access denied: no permission for '${permission}'` });
  next();
};

module.exports = { protect, authorize, checkPermission };
