const router = require('express').Router();
const Invoice = require('../models/Invoice');
const { buildInvoiceHTML } = require('../controllers/invoiceController');

// GET /api/public/invoices/:id/pdf
// Returns the invoice as a printable HTML page with auto-print triggered
// Browser shows "Save as PDF" dialog automatically — same format as PrintInvoice.jsx
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('business', 'name address phone email gstin')
      .lean();

    if (!invoice) {
      return res.status(404).send(`
        <!DOCTYPE html><html><body style="font-family:Arial;text-align:center;padding:60px">
          <h2>Invoice not found</h2>
          <p>This invoice link may be invalid.</p>
        </body></html>
      `);
    }

    // Get the invoice HTML (same as print page format)
    let html = buildInvoiceHTML(invoice);

    // Inject auto-print script so browser opens Save as PDF dialog immediately
    html = html.replace('</body>', `
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
      <style>
        @media print {
          body * { visibility: visible; }
          @page { size: A4 portrait; margin: 0; }
        }
        @media screen {
          body { background: #f3f4f6; }
          div[style*="max-width:794px"] {
            margin: 20px auto !important;
            box-shadow: 0 1px 8px rgba(0,0,0,0.1);
          }
        }
      </style>
    </body>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Public PDF error:', err);
    if (!res.headersSent) res.status(500).send('<h2>Failed to load invoice</h2>');
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
