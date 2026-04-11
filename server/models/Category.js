const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  description: String,
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
