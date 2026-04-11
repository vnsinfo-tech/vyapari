const router = require('express').Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, adjustStock } = require('../controllers/productController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect, checkPermission('inventory'));
router.get('/', getProducts);
router.post('/', createProduct);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/stock', adjustStock);

module.exports = router;
