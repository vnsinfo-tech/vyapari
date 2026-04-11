const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  type: { type: String, enum: ['received', 'paid'], required: true },
  party: { type: mongoose.Schema.Types.ObjectId, refPath: 'partyModel' },
  partyModel: { type: String, enum: ['Customer', 'Supplier'] },
  partyName: String,
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMode: { type: String, enum: ['cash', 'upi', 'bank', 'cheque'], default: 'cash' },
  reference: String,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
