const router = require('express').Router();
const { getStaff, inviteStaff, updateStaff, removeStaff, getRoleDefaults } = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');
const StaffRole = require('../models/StaffRole');

// ── Public to any authenticated user ──────────────────────────────────────────

// Get own permissions (used by frontend on login)
router.get('/my-permissions', protect, async (req, res, next) => {
  try {
    const isOwner = req.user.business?.owner?.toString() === req.user._id.toString();
    if (isOwner) return res.json({ isOwner: true, permissions: null, role: 'admin' });
    const staffRole = await StaffRole.findOne({
      user: req.user._id,
      business: req.user.business._id,
      isActive: true,
    });
    if (!staffRole) return res.json({ isOwner: false, permissions: {}, role: null });
    res.json({ isOwner: false, permissions: staffRole.permissions, role: staffRole.role });
  } catch (err) { next(err); }
});

// Role defaults — any authenticated user needs this to render the Staff page
router.get('/role-defaults', protect, getRoleDefaults);

// ── Admin only ─────────────────────────────────────────────────────────────────
router.get('/',     protect, authorize('admin'), getStaff);
router.post('/',    protect, authorize('admin'), inviteStaff);
router.put('/:id',  protect, authorize('admin'), updateStaff);
router.delete('/:id', protect, authorize('admin'), removeStaff);

module.exports = router;
