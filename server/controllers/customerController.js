const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false };
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
    const [data, total] = await Promise.all([
      Customer.find(query).select('name phone email gstin address createdAt').sort(sort).skip((page - 1) * limit).limit(+limit).lean(),
      Customer.countDocuments(query),
    ]);
    res.json({ data, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const invoices = await Invoice.find({ customer: customer._id, isDeleted: false }).sort('-invoiceDate').limit(10);
    const outstanding = await Invoice.aggregate([
      { $match: { customer: customer._id, isDeleted: false, status: { $in: ['sent', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } },
    ]);
    res.json({ customer, invoices, outstanding: outstanding[0]?.total || 0 });
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create({ ...req.body, business: req.user.business._id });
    res.status(201).json(customer);
  } catch (err) { next(err); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { business: _b, ...updateData } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id }, updateData, { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    await Customer.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Customer deleted' });
  } catch (err) { next(err); }
};
