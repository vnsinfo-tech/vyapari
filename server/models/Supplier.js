const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  gstin: String,
  address: { line1: String, city: String, state: String, pincode: String },
  openingBalance: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Indexes for fast queries
supplierSchema.index({ business: 1, isDeleted: 1, createdAt: -1 });
supplierSchema.index({ business: 1, isDeleted: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
