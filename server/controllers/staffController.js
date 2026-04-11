const User = require('../models/User');
const StaffRole = require('../models/StaffRole');
const ROLE_DEFAULTS = StaffRole.ROLE_DEFAULTS;

exports.getStaff = async (req, res, next) => {
  try {
    const staff = await StaffRole.find({ business: req.user.business._id })
      .populate('user', 'name email role isActive')
      .sort('-createdAt');
    res.json(staff);
  } catch (err) { next(err); }
};

exports.inviteStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: 'Name, email, password and role are required' });

    // Check if already a staff member of this business
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const existingRole = await StaffRole.findOne({ user: existingUser._id, business: req.user.business._id });
      if (existingRole) {
        if (existingRole.isActive)
          return res.status(400).json({ message: 'This user is already a staff member' });
        // Reactivate if previously removed
        existingRole.isActive = true;
        existingRole.role = role;
        existingRole.permissions = permissions || ROLE_DEFAULTS[role];
        await existingRole.save();
        return res.json(await existingRole.populate('user', 'name email role isActive'));
      }
    }

    // Create user account if doesn't exist
    let user = existingUser;
    if (!user) {
      user = await User.create({
        name, email, password,
        role,
        business: req.user.business._id,
      });
    }

    // Use role defaults if no custom permissions provided
    const finalPermissions = permissions || ROLE_DEFAULTS[role];

    const staffRole = await StaffRole.create({
      business: req.user.business._id,
      user: user._id,
      role,
      permissions: finalPermissions,
    });

    res.status(201).json(await staffRole.populate('user', 'name email role isActive'));
  } catch (err) { next(err); }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { role, permissions, isActive } = req.body;

    const staffRole = await StaffRole.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!staffRole) return res.status(404).json({ message: 'Staff not found' });

    // If role changed, reset permissions to new role defaults unless custom permissions provided
    if (role && role !== staffRole.role) {
      staffRole.role = role;
      staffRole.permissions = permissions || ROLE_DEFAULTS[role];
      // Also update the user's role field
      await User.findByIdAndUpdate(staffRole.user, { role });
    } else if (permissions) {
      staffRole.permissions = permissions;
    }

    if (typeof isActive === 'boolean') staffRole.isActive = isActive;

    await staffRole.save();
    res.json(await staffRole.populate('user', 'name email role isActive'));
  } catch (err) { next(err); }
};

exports.removeStaff = async (req, res, next) => {
  try {
    const staffRole = await StaffRole.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id },
      { isActive: false },
      { new: true }
    );
    if (!staffRole) return res.status(404).json({ message: 'Staff not found' });
    // Deactivate user account too
    await User.findByIdAndUpdate(staffRole.user, { isActive: false });
    res.json({ message: 'Staff member deactivated' });
  } catch (err) { next(err); }
};

exports.getRoleDefaults = (req, res) => {
  res.json(ROLE_DEFAULTS);
};
