const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

exports.getDashboard = async (req, res, next) => {
  try {
    const businessId = req.user.business._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const mongoose = require('mongoose');
    const bId = new mongoose.Types.ObjectId(businessId);

    const [
      totalSalesMonth, totalPurchasesMonth, totalExpensesMonth,
      pendingInvoices, lowStockProducts, recentInvoices,
      monthlySales, topProducts, totalCustomers,
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { business: bId, isDeleted: false, invoiceDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Purchase.aggregate([
        { $match: { business: bId, isDeleted: false, purchaseDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Expense.aggregate([
        { $match: { business: bId, isDeleted: false, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { business: bId, isDeleted: false, status: { $in: ['sent', 'partial', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$dueAmount' }, count: { $sum: 1 } } },
      ]),
      Product.find({ business: businessId, isDeleted: false, $expr: { $lte: ['$stock', '$lowStockAlert'] } })
        .select('name stock lowStockAlert unit').limit(10).lean(),
      Invoice.find({ business: businessId, isDeleted: false })
        .select('invoiceNumber customerName grandTotal dueAmount status invoiceDate').sort('-invoiceDate').limit(5).populate('customer', 'name').lean(),
      Invoice.aggregate([
        { $match: { business: bId, isDeleted: false, invoiceDate: { $gte: startOfYear } } },
        { $group: { _id: { month: { $month: '$invoiceDate' } }, total: { $sum: '$grandTotal' }, totalTax: { $sum: '$totalTax' } } },
        { $sort: { '_id.month': 1 } },
      ]),
      Invoice.aggregate([
        { $match: { business: bId, isDeleted: false } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.amount' } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
      ]),
      Customer.countDocuments({ business: businessId, isDeleted: false }),
    ]);

    res.json({
      kpis: {
        salesThisMonth: totalSalesMonth[0]?.total || 0,
        salesCount: totalSalesMonth[0]?.count || 0,
        purchasesThisMonth: totalPurchasesMonth[0]?.total || 0,
        expensesThisMonth: totalExpensesMonth[0]?.total || 0,
        pendingDues: pendingInvoices[0]?.total || 0,
        pendingCount: pendingInvoices[0]?.count || 0,
        totalCustomers,
        lowStockCount: lowStockProducts.length,
      },
      recentInvoices,
      lowStockProducts,
      monthlySales,
      topProducts,
    });
  } catch (err) { next(err); }
};
