const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const Category = require('../models/Category');
const StockAdjustment = require('../models/StockAdjustment');
const Business = require('../models/Business');

exports.exportBackup = async (req, res, next) => {
  try {
    const bId = req.user.business._id;
    const [invoices, customers, suppliers, products, expenses, purchases, payments, categories, stockAdjustments, business] = await Promise.all([
      Invoice.find({ business: bId }).lean(),
      Customer.find({ business: bId }).lean(),
      Supplier.find({ business: bId }).lean(),
      Product.find({ business: bId }).lean(),
      Expense.find({ business: bId }).lean(),
      Purchase.find({ business: bId }).lean(),
      Payment.find({ business: bId }).lean(),
      Category.find({ business: bId }).lean(),
      StockAdjustment.find({ business: bId }).lean(),
      Business.findById(bId).lean(),
    ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      business,
      counts: {
        invoices: invoices.length,
        customers: customers.length,
        suppliers: suppliers.length,
        products: products.length,
        expenses: expenses.length,
        purchases: purchases.length,
        payments: payments.length,
        categories: categories.length,
        stockAdjustments: stockAdjustments.length,
      },
      data: { invoices, customers, suppliers, products, expenses, purchases, payments, categories, stockAdjustments },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=vyapari-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (err) { next(err); }
};

exports.importBackup = async (req, res, next) => {
  try {
    const bId = req.user.business._id;
    const backup = req.body;

    if (!backup?.version || !backup?.data) {
      return res.status(400).json({ message: 'Invalid backup file format' });
    }

    const { data } = backup;

    // Delete existing data for this business
    await Promise.all([
      Invoice.deleteMany({ business: bId }),
      Customer.deleteMany({ business: bId }),
      Supplier.deleteMany({ business: bId }),
      Product.deleteMany({ business: bId }),
      Expense.deleteMany({ business: bId }),
      Purchase.deleteMany({ business: bId }),
      Payment.deleteMany({ business: bId }),
      Category.deleteMany({ business: bId }),
      StockAdjustment.deleteMany({ business: bId }),
    ]);

    // Re-insert backup data (force business id to current)
    const stamp = (arr) => (arr || []).map(d => ({ ...d, business: bId }));

    const results = await Promise.allSettled([
      data.customers?.length     ? Customer.insertMany(stamp(data.customers), { ordered: false })         : Promise.resolve(),
      data.suppliers?.length     ? Supplier.insertMany(stamp(data.suppliers), { ordered: false })         : Promise.resolve(),
      data.categories?.length    ? Category.insertMany(stamp(data.categories), { ordered: false })        : Promise.resolve(),
      data.products?.length      ? Product.insertMany(stamp(data.products), { ordered: false })           : Promise.resolve(),
      data.invoices?.length      ? Invoice.insertMany(stamp(data.invoices), { ordered: false })           : Promise.resolve(),
      data.purchases?.length     ? Purchase.insertMany(stamp(data.purchases), { ordered: false })         : Promise.resolve(),
      data.expenses?.length      ? Expense.insertMany(stamp(data.expenses), { ordered: false })           : Promise.resolve(),
      data.payments?.length      ? Payment.insertMany(stamp(data.payments), { ordered: false })           : Promise.resolve(),
      data.stockAdjustments?.length ? StockAdjustment.insertMany(stamp(data.stockAdjustments), { ordered: false }) : Promise.resolve(),
    ]);

    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);

    res.json({
      message: 'Backup restored successfully',
      restored: {
        customers: data.customers?.length || 0,
        suppliers: data.suppliers?.length || 0,
        categories: data.categories?.length || 0,
        products: data.products?.length || 0,
        invoices: data.invoices?.length || 0,
        purchases: data.purchases?.length || 0,
        expenses: data.expenses?.length || 0,
        payments: data.payments?.length || 0,
        stockAdjustments: data.stockAdjustments?.length || 0,
      },
      warnings: failed.length ? failed : undefined,
    });
  } catch (err) { next(err); }
};
