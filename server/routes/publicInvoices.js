const router = require('express').Router();
const Invoice = require('../models/Invoice');
const generateInvoicePDF = require('../utils/generateInvoicePDF');

// GET /api/public/invoices/:id/pdf — direct PDF download, no auth required
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('business', 'name address phone email gstin')
      .lean();

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Public PDF error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

// GET /api/public/invoices/:id — returns invoice JSON, no auth required
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('business', 'name address phone email gstin')
      .lean();

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const {
      _id, invoiceNumber, invoiceDate, dueDate, status, isInterState,
      paymentMode, notes, customerName, customerGstin, customerAddress,
      items, subtotal, totalDiscount, totalCgst, totalSgst, totalIgst,
      shipping, grandTotal, paidAmount, dueAmount, business,
    } = invoice;

    res.json({
      _id, invoiceNumber, invoiceDate, dueDate, status, isInterState,
      paymentMode, notes, customerName, customerGstin, customerAddress,
      items, subtotal, totalDiscount, totalCgst, totalSgst, totalIgst,
      shipping, grandTotal, paidAmount, dueAmount, business,
    });
  } catch (err) {
    console.error('Public invoice error:', err);
    res.status(500).json({ message: 'Failed to load invoice' });
  }
});

module.exports = router;
