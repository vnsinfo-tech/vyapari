const router = require('express').Router();
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const payments = await Payment.find({ business: req.user.business._id }).sort('-date').limit(50);
    res.json(payments);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const payment = await Payment.create({ ...req.body, business: req.user.business._id });
    if (req.body.invoice) {
      const inv = await Invoice.findById(req.body.invoice);
      if (inv) {
        inv.paidAmount += req.body.amount;
        inv.dueAmount = inv.grandTotal - inv.paidAmount;
        inv.status = inv.dueAmount <= 0 ? 'paid' : 'partial';
        await inv.save();
      }
    }
    if (req.body.purchase) {
      const pur = await Purchase.findById(req.body.purchase);
      if (pur) {
        pur.paidAmount += req.body.amount;
        pur.dueAmount = pur.grandTotal - pur.paidAmount;
        pur.status = pur.dueAmount <= 0 ? 'paid' : 'partial';
        await pur.save();
      }
    }
    res.status(201).json(payment);
  } catch (err) { next(err); }
});

module.exports = router;
