const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');

exports.exportBackup = async (req, res, next) => {
  try {
    const businessId = req.user.business._id;
    const [invoices, customers, suppliers, products, expenses, purchases] = await Promise.all([
      Invoice.find({ business: businessId }),
      Customer.find({ business: businessId }),
      Supplier.find({ business: businessId }),
      Product.find({ business: businessId }),
      Expense.find({ business: businessId }),
      Purchase.find({ business: businessId }),
    ]);
    const backup = { exportedAt: new Date(), business: businessId, invoices, customers, suppliers, products, expenses, purchases };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
    res.json(backup);
  } catch (err) { next(err); }
};
