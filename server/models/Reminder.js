const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  amount: Number,
  dueDate: Date,
  channel: { type: String, enum: ['email', 'sms', 'whatsapp'], default: 'email' },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  sentAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
