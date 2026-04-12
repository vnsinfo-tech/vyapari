const Product = require('../models/Product');
const StockAdjustment = require('../models/StockAdjustment');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, lowStock, sort = '-createdAt' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false };
    if (search) query.$or = [{ name: new RegExp(escapeRegex(search), 'i') }, { sku: new RegExp(escapeRegex(search), 'i') }, { barcode: new RegExp(escapeRegex(search), 'i') }];
    if (category) query.category = category;
    if (lowStock === 'true') query.$expr = { $lte: ['$stock', '$lowStockAlert'] };
    const [data, total] = await Promise.all([
      Product.find(query).select('name sku barcode category unit salePrice purchasePrice gstRate stock lowStockAlert').sort(sort).skip((page - 1) * limit).limit(+limit).populate('category', 'name').lean(),
      Product.countDocuments(query),
    ]);
    res.json({ data, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, business: req.user.business._id }).populate('category');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, business: req.user.business._id });
    res.status(201).json(product);
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { business: _b, ...updateData } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id }, updateData, { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await Product.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { quantity, type, reason } = req.body;
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) return res.status(400).json({ message: 'Quantity must be a non-negative number' });
    if (!['in', 'out', 'set', 'adjustment'].includes(type)) return res.status(400).json({ message: 'Invalid type' });

    const product = await Product.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const stockBefore = product.stock;
    let stockAfter;

    if (type === 'set') {
      stockAfter = qty;
    } else if (type === 'out') {
      stockAfter = stockBefore - qty;
    } else {
      stockAfter = stockBefore + qty;
    }

    if (stockAfter < 0) return res.status(400).json({ message: `Insufficient stock. Current stock is ${stockBefore}` });

    product.stock = stockAfter;
    await product.save();

    await StockAdjustment.create({
      business: req.user.business._id,
      product: product._id,
      type: type === 'set' ? 'adjustment' : type,
      quantity: type === 'set' ? Math.abs(stockAfter - stockBefore) : qty,
      reason: reason || '',
      createdBy: req.user._id,
    });

    res.json(product);
  } catch (err) { next(err); }
};
