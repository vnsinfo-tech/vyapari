const mongoose = require('mongoose');

const ROLE_DEFAULTS = {
  admin:      { invoices: true,  purchases: true,  expenses: true,  inventory: true,  reports: true,  customers: true,  suppliers: true,  staff: true,  settings: true  },
  manager:    { invoices: true,  purchases: true,  expenses: true,  inventory: true,  reports: true,  customers: true,  suppliers: true,  staff: false, settings: false },
  accountant: { invoices: true,  purchases: true,  expenses: true,  inventory: false, reports: true,  customers: true,  suppliers: true,  staff: false, settings: false },
  cashier:    { invoices: true,  purchases: false, expenses: false, inventory: false, reports: false, customers: true,  suppliers: false, staff: false, settings: false },
};

const permissionsSchema = {
  invoices:   { type: Boolean, default: true  },
  purchases:  { type: Boolean, default: false },
  expenses:   { type: Boolean, default: false },
  inventory:  { type: Boolean, default: false },
  reports:    { type: Boolean, default: false },
  customers:  { type: Boolean, default: true  },
  suppliers:  { type: Boolean, default: false },
  staff:      { type: Boolean, default: false },
  settings:   { type: Boolean, default: false },
};

const staffRoleSchema = new mongoose.Schema({
  business:    { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:        { type: String, enum: ['admin', 'manager', 'accountant', 'cashier'], required: true },
  permissions: permissionsSchema,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

const StaffRole = mongoose.model('StaffRole', staffRoleSchema);

module.exports = StaffRole;
module.exports.ROLE_DEFAULTS = ROLE_DEFAULTS;
