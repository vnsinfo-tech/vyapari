const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: String,
  rate: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  amount: { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  billNumber: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: String,
  purchaseDate: { type: Date, default: Date.now },
  dueDate: Date,
  items: [purchaseItemSchema],
  subtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['cash', 'upi', 'bank', 'cheque', 'credit'], default: 'cash' },
  status: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  notes: String,
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
