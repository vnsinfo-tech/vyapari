const router = require('express').Router();
const { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, downloadPDF } = require('../controllers/invoiceController-fixed');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect, checkPermission('invoices'));
router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.get('/:id/pdf', downloadPDF);

module.exports = router;
