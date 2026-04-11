const router = require('express').Router();
const { getSalesReport, getGSTReport, getProfitLoss, getStockValuation, getOutstandingReport } = require('../controllers/reportController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect, checkPermission('reports'));
router.get('/sales', getSalesReport);
router.get('/gst', getGSTReport);
router.get('/profit-loss', getProfitLoss);
router.get('/stock-valuation', getStockValuation);
router.get('/outstanding', getOutstandingReport);

module.exports = router;
