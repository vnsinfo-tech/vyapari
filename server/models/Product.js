const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  sku: String,
  barcode: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  unit: { type: String, default: 'pcs' },
  salePrice: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  mrp: Number,
  gstRate: { type: Number, default: 18 },
  hsnCode: String,
  stock: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 5 },
  batchNumber: String,
  expiryDate: Date,
  description: String,
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
