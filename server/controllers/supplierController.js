const Supplier = require('../models/Supplier');

exports.getSuppliers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false };
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
    const [data, total] = await Promise.all([
      Supplier.find(query).sort(sort).skip((page - 1) * limit).limit(+limit),
      Supplier.countDocuments(query),
    ]);
    res.json({ data, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) { next(err); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create({ ...req.body, business: req.user.business._id });
    res.status(201).json(supplier);
  } catch (err) { next(err); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id }, req.body, { new: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) { next(err); }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    await Supplier.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Supplier deleted' });
  } catch (err) { next(err); }
};
