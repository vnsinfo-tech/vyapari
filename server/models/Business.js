const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['retailer', 'wholesaler', 'distributor', 'manufacturer', 'service'], default: 'retailer' },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  phone: String,
  email: String,
  address: {
    line1: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  logo: String,
  currency: { type: String, default: 'INR' },
  financialYearStart: { type: String, default: 'April' },
  invoicePrefix: { type: String, default: 'INV' },
  invoiceCounter: { type: Number, default: 1 },
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  plan: { type: String, enum: ['free', 'silver', 'gold'], default: 'free' },
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);
