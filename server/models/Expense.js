const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMode: { type: String, enum: ['cash', 'upi', 'bank', 'cheque'], default: 'cash' },
  description: String,
  isRecurring: { type: Boolean, default: false },
  recurringInterval: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Indexes for fast queries
expenseSchema.index({ business: 1, isDeleted: 1, date: -1 });
expenseSchema.index({ business: 1, isDeleted: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
