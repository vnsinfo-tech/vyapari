const router = require('express').Router();
const { getPurchases, getPurchase, createPurchase, updatePurchase, deletePurchase } = require('../controllers/purchaseController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect, checkPermission('purchases'));
router.get('/', getPurchases);
router.post('/', createPurchase);
router.get('/:id', getPurchase);
router.put('/:id', updatePurchase);
router.delete('/:id', deletePurchase);

module.exports = router;
