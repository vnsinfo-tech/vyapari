const Expense = require('../models/Expense');

exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, sort = '-date' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false };
    if (category) query.category = category;
    if (startDate || endDate) query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
    const [data, total] = await Promise.all([
      Expense.find(query).sort(sort).skip((page - 1) * limit).limit(+limit),
      Expense.countDocuments(query),
    ]);
    res.json({ data, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, business: req.user.business._id });
    res.status(201).json(expense);
  } catch (err) { next(err); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id }, req.body, { new: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) { next(err); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    await Expense.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
};
