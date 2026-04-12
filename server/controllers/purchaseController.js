const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const StockAdjustment = require('../models/StockAdjustment');

exports.getPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, sort = '-purchaseDate' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false };
    if (search) query.supplierName = new RegExp(search, 'i');
    if (status) query.status = status;
    const [data, total] = await Promise.all([
      Purchase.find(query).select('purchaseNumber billNumber supplierName grandTotal paidAmount dueAmount status purchaseDate').sort(sort).skip((page - 1) * limit).limit(+limit).populate('supplier', 'name').lean(),
      Purchase.countDocuments(query),
    ]);
    const fixed = data.map(p => ({
      ...p,
      paidAmount: p.paidAmount || 0,
      dueAmount: p.dueAmount > 0 ? p.dueAmount : p.grandTotal - (p.paidAmount || 0),
    }));
    res.json({ data: fixed, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, business: req.user.business._id }).populate('supplier').lean();
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (err) { next(err); }
};

exports.createPurchase = async (req, res, next) => {
  try {
    const { items, ...rest } = req.body;
    let subtotal = 0, totalTax = 0;
    const processedItems = items.map(item => {
      const amount = item.quantity * item.rate;
      const tax = (amount * (item.gstRate || 0)) / 100;
      subtotal += amount;
      totalTax += tax;
      const processed = { ...item, amount: amount + tax };
      if (!processed.product) delete processed.product;
      return processed;
    });
    const grandTotal = subtotal + totalTax;
    const paidAmount = parseFloat(rest.paidAmount) || 0;
    const dueAmount = grandTotal - paidAmount;

    const purchase = await Purchase.create({
      ...rest, business: req.user.business._id, items: processedItems,
      subtotal, totalTax, grandTotal, paidAmount, dueAmount,
      status: dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
    });

    // Increase stock
    for (const item of processedItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        await StockAdjustment.create({ business: req.user.business._id, product: item.product, type: 'in', quantity: item.quantity, reason: 'Purchase', createdBy: req.user._id });
      }
    }

    res.status(201).json(purchase);
  } catch (err) { next(err); }
};

exports.updatePurchase = async (req, res, next) => {
  try {
    const { business: _b, items, ...rest } = req.body;
    if (!rest.supplier) delete rest.supplier;

    const oldPurchase = await Purchase.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!oldPurchase) return res.status(404).json({ message: 'Purchase not found' });

    // Recalculate totals from scratch
    const sourceItems = items || oldPurchase.items;
    let subtotal = 0, totalTax = 0;
    const processedItems = sourceItems.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;
      const amount = qty * rate;
      const tax = (amount * gstRate) / 100;
      subtotal += amount;
      totalTax += tax;
      const processed = { ...item, amount: amount + tax };
      if (!processed.product) delete processed.product;
      return processed;
    });
    const grandTotal = subtotal + totalTax;
    const paidAmount = parseFloat(rest.paidAmount) || 0;
    const dueAmount = grandTotal - paidAmount;

    const updateData = {
      ...rest,
      items: processedItems,
      subtotal,
      totalTax,
      grandTotal,
      paidAmount,
      dueAmount,
      status: dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
    };

    const purchase = await Purchase.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id },
      updateData,
      { new: true, runValidators: false }
    );

    // Adjust stock if items changed
    if (items) {
      for (const item of oldPurchase.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
          await StockAdjustment.create({ business: req.user.business._id, product: item.product, type: 'out', quantity: item.quantity, reason: 'Purchase Edit - Reverse', createdBy: req.user._id });
        }
      }
      for (const item of processedItems) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
          await StockAdjustment.create({ business: req.user.business._id, product: item.product, type: 'in', quantity: item.quantity, reason: 'Purchase Edit', createdBy: req.user._id });
        }
      }
    }

    res.json(purchase);
  } catch (err) { next(err); }
};

exports.fixPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ business: req.user.business._id, isDeleted: false, grandTotal: { $gt: 0 } });
    let fixed = 0;
    for (const p of purchases) {
      let subtotal = 0, totalTax = 0;
      for (const item of p.items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const gstRate = parseFloat(item.gstRate) || 0;
        const amount = qty * rate;
        subtotal += amount;
        totalTax += amount * gstRate / 100;
      }
      const grandTotal = subtotal + totalTax || p.grandTotal;
      const paidAmount = parseFloat(p.paidAmount) || 0;
      const dueAmount = grandTotal - paidAmount;
      const status = dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';
      if (p.dueAmount !== dueAmount || p.grandTotal !== grandTotal || p.status !== status) {
        await Purchase.findByIdAndUpdate(p._id, { subtotal, totalTax, grandTotal, paidAmount, dueAmount, status });
        fixed++;
      }
    }
    res.json({ message: `Fixed ${fixed} purchases` });
  } catch (err) { next(err); }
};

exports.deletePurchase = async (req, res, next) => {
  try {
    await Purchase.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Purchase deleted' });
  } catch (err) { next(err); }
};
