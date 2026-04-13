const router = require('express').Router();
const { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, downloadPDF, getPublicInvoice } = require('../controllers/invoiceController');
const { protect, checkPermission } = require('../middleware/auth');

// Public route — no auth required (for WhatsApp shared links)
router.get('/public/:id', getPublicInvoice);

router.use(protect, checkPermission('invoices'));
router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.get('/:id/pdf', downloadPDF);

module.exports = router;
