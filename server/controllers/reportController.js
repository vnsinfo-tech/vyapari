const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const businessId = new mongoose.Types.ObjectId(req.user.business._id);
    const match = { business: businessId, isDeleted: false };
    if (startDate) match.invoiceDate = { $gte: new Date(startDate) };
    if (endDate) match.invoiceDate = { ...match.invoiceDate, $lte: new Date(endDate) };

    const groupFormat = groupBy === 'month' ? { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } }
      : groupBy === 'year' ? { year: { $year: '$invoiceDate' } }
      : { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' }, day: { $dayOfMonth: '$invoiceDate' } };

    const data = await Invoice.aggregate([
      { $match: match },
      { $group: { _id: groupFormat, totalSales: { $sum: '$grandTotal' }, totalTax: { $sum: '$totalTax' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    res.json(data);
  } catch (err) { next(err); }
};

exports.getGSTReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = new mongoose.Types.ObjectId(req.user.business._id);
    const match = { business: businessId, isDeleted: false };
    if (startDate) match.invoiceDate = { $gte: new Date(startDate) };
    if (endDate) match.invoiceDate = { ...match.invoiceDate, $lte: new Date(endDate) };

    const [sales, purchases] = await Promise.all([
      Invoice.aggregate([
        { $match: match },
        { $group: { _id: null, totalCgst: { $sum: '$totalCgst' }, totalSgst: { $sum: '$totalSgst' }, totalIgst: { $sum: '$totalIgst' }, totalTax: { $sum: '$totalTax' }, totalSales: { $sum: '$grandTotal' } } },
      ]),
      Purchase.aggregate([
        { $match: { business: businessId, isDeleted: false } },
        { $group: { _id: null, totalTax: { $sum: '$totalTax' }, totalPurchases: { $sum: '$grandTotal' } } },
      ]),
    ]);
    res.json({ sales: sales[0] || {}, purchases: purchases[0] || {} });
  } catch (err) { next(err); }
};

exports.getProfitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = new mongoose.Types.ObjectId(req.user.business._id);
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [sales, purchases, expenses] = await Promise.all([
      Invoice.aggregate([
        { $match: { business: businessId, isDeleted: false, ...(Object.keys(dateFilter).length && { invoiceDate: dateFilter }) } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Purchase.aggregate([
        { $match: { business: businessId, isDeleted: false, ...(Object.keys(dateFilter).length && { purchaseDate: dateFilter }) } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Expense.aggregate([
        { $match: { business: businessId, isDeleted: false, ...(Object.keys(dateFilter).length && { date: dateFilter }) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalSales = sales[0]?.total || 0;
    const totalPurchases = purchases[0]?.total || 0;
    const totalExpenses = expenses[0]?.total || 0;
    const grossProfit = totalSales - totalPurchases;
    const netProfit = grossProfit - totalExpenses;

    res.json({ totalSales, totalPurchases, totalExpenses, grossProfit, netProfit });
  } catch (err) { next(err); }
};

exports.getStockValuation = async (req, res, next) => {
  try {
    const products = await Product.find({ business: req.user.business._id, isDeleted: false });
    const valuation = products.map(p => ({
      name: p.name, stock: p.stock, purchasePrice: p.purchasePrice, salePrice: p.salePrice,
      purchaseValue: p.stock * p.purchasePrice, saleValue: p.stock * p.salePrice,
    }));
    const totalPurchaseValue = valuation.reduce((s, p) => s + p.purchaseValue, 0);
    const totalSaleValue = valuation.reduce((s, p) => s + p.saleValue, 0);
    res.json({ products: valuation, totalPurchaseValue, totalSaleValue });
  } catch (err) { next(err); }
};

exports.getOutstandingReport = async (req, res, next) => {
  try {
    const data = await Invoice.find({
      business: req.user.business._id, isDeleted: false,
      status: { $in: ['sent', 'partial', 'overdue'] },
    }).populate('customer', 'name phone').sort('-dueDate');
    res.json(data);
  } catch (err) { next(err); }
};
