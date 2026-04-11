const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  gstin: String,
  address: { line1: String, city: String, state: String, pincode: String },
  openingBalance: { type: Number, default: 0 },
  balanceType: { type: String, enum: ['receivable', 'payable'], default: 'receivable' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
