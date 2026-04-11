const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  hsnCode: String,
  quantity: { type: Number, required: true },
  unit: String,
  rate: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  amount: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  invoiceNumber: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  customerGstin: String,
  customerAddress: String,
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalCgst: { type: Number, default: 0 },
  totalSgst: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['cash', 'upi', 'bank', 'cheque', 'credit'], default: 'cash' },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'], default: 'draft' },
  isInterState: { type: Boolean, default: false },
  notes: String,
  termsConditions: String,
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
