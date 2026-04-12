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
      Purchase.find(query).select('purchaseNumber supplierName grandTotal status purchaseDate').sort(sort).skip((page - 1) * limit).limit(+limit).populate('supplier', 'name').lean(),
      Purchase.countDocuments(query),
    ]);
    res.json({ data, total, pages: Math.ceil(total / limit) });
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
      return { ...item, amount: amount + tax };
    });
    const grandTotal = subtotal + totalTax;
    const dueAmount = grandTotal - (rest.paidAmount || 0);

    const purchase = await Purchase.create({
      ...rest, business: req.user.business._id, items: processedItems,
      subtotal, totalTax, grandTotal, dueAmount,
      status: dueAmount <= 0 ? 'paid' : rest.paidAmount > 0 ? 'partial' : 'pending',
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
    const oldPurchase = await Purchase.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!oldPurchase) return res.status(404).json({ message: 'Purchase not found' });

    const { items: newItems, paidAmount: newPaidAmount, ...rest } = req.body;
    
    // Process new items if provided
    let subtotal = oldPurchase.subtotal, totalTax = oldPurchase.totalTax;
    const processedItems = newItems ? newItems.map(item => {
      const amount = item.quantity * item.rate;
      const tax = (amount * (item.gstRate || 0)) / 100;
      subtotal += amount;
      totalTax += tax;
      return { ...item, amount: amount + tax };
    }) : oldPurchase.items;

    const grandTotal = subtotal + totalTax;
    const dueAmount = grandTotal - (newPaidAmount !== undefined ? newPaidAmount : oldPurchase.paidAmount);
    const status = dueAmount <= 0 ? 'paid' : (newPaidAmount !== undefined && newPaidAmount > 0) ? 'partial' : oldPurchase.status;

    // Prepare update data
    const updateData = {
      ...rest,
      ...(newItems && { items: processedItems }),
      subtotal,
      totalTax,
      grandTotal,
      dueAmount,
      status,
    };

    const purchase = await Purchase.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id },
      updateData,
      { new: true, runValidators: true }
    );

    // Handle stock adjustments only if items changed
    if (newItems) {
      // Reverse old stock
      for (const item of oldPurchase.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
          await StockAdjustment.create({
            business: req.user.business._id,
            product: item.product,
            type: 'out',
            quantity: item.quantity,
            reason: 'Purchase Edit - Reverse',
            createdBy: req.user._id,
          });
        }
      }

      // Apply new stock
      for (const item of processedItems) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
          await StockAdjustment.create({
            business: req.user.business._id,
            product: item.product,
            type: 'in',
            quantity: item.quantity,
            reason: 'Purchase Edit',
            createdBy: req.user._id,
          });
        }
      }
    }

    // Update payment status if paid amount changed
    if (newPaidAmount !== undefined && newPaidAmount !== oldPurchase.paidAmount) {
      // Future: Create Payment record if needed
    }

    res.json(purchase);
  } catch (err) {
    console.error('Purchase update error:', err);
    next(err);
  }
};

exports.deletePurchase = async (req, res, next) => {
  try {
    await Purchase.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Purchase deleted' });
  } catch (err) { next(err); }
};
