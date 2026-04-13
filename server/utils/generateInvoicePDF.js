const PDFDocument = require('pdfkit');

/**
 * Generates a PDF buffer from an invoice object using pdfkit.
 * Layout matches the HTML invoice format exactly.
 * Returns a Buffer.
 */
function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const b = invoice.business || {};
      const W = doc.page.width;   // 595
      const H = doc.page.height;  // 842
      const PAD = 36;
      const CONTENT_W = W - PAD * 2;

      const GREEN  = '#16a34a';
      const DARK   = '#1f2937';
      const GRAY   = '#6b7280';
      const LGRAY  = '#9ca3af';
      const WHITE  = '#ffffff';
      const BGALT  = '#f9fafb';
      const BGLIGHT = '#f3f4f6';

      const STATUS_BG = {
        paid: '#16a34a', partial: '#d97706', overdue: '#dc2626',
        sent: '#2563eb', draft: '#6b7280', cancelled: '#6b7280',
      };

      const fmt = (n) => `Rs.${(n || 0).toFixed(2)}`;
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

      // ── Top green bar ──
      doc.rect(0, 0, W, 7).fill(GREEN);

      // ── Header ──
      let y = 20;

      // Business name
      doc.fontSize(18).fillColor(DARK).font('Helvetica-Bold')
        .text(b.name || 'Business', PAD, y, { width: 280 });

      // Business details
      y += 26;
      doc.fontSize(9).fillColor(GRAY).font('Helvetica');
      if (b.address) {
        const addr = [b.address.line1, b.address.city, b.address.state, b.address.pincode].filter(Boolean).join(', ');
        if (addr) { doc.text(addr, PAD, y, { width: 280 }); y += 13; }
      }
      if (b.phone) { doc.text(`Phone: ${b.phone}`, PAD, y, { width: 280 }); y += 13; }
      if (b.email) { doc.text(`Email: ${b.email}`, PAD, y, { width: 280 }); y += 13; }
      if (b.gstin) {
        doc.fillColor(DARK).font('Helvetica-Bold').text(`GSTIN: ${b.gstin}`, PAD, y, { width: 280 });
        y += 13;
      }

      // TAX INVOICE badge (right)
      const badgeX = W - PAD - 160;
      doc.rect(badgeX, 20, 160, 22).fill(GREEN);
      doc.fontSize(12).fillColor(WHITE).font('Helvetica-Bold')
        .text('TAX INVOICE', badgeX, 26, { width: 160, align: 'center' });

      // Status badge
      const statusBg = STATUS_BG[invoice.status] || '#6b7280';
      doc.rect(badgeX + 30, 48, 100, 16).fill(statusBg);
      doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
        .text((invoice.status || '').toUpperCase(), badgeX + 30, 52, { width: 100, align: 'center' });

      // Invoice meta
      let metaY = 72;
      doc.fontSize(9).fillColor(LGRAY).font('Helvetica');
      doc.text('Invoice No: ', badgeX, metaY, { continued: true })
        .fillColor(DARK).font('Helvetica-Bold').text(invoice.invoiceNumber || '-');
      metaY += 14;
      doc.fillColor(LGRAY).font('Helvetica').text('Date: ', badgeX, metaY, { continued: true })
        .fillColor(DARK).font('Helvetica-Bold').text(fmtDate(invoice.invoiceDate));
      metaY += 14;
      if (invoice.dueDate) {
        doc.fillColor(LGRAY).font('Helvetica').text('Due Date: ', badgeX, metaY, { continued: true })
          .fillColor('#dc2626').font('Helvetica-Bold').text(fmtDate(invoice.dueDate));
        metaY += 14;
      }

      // ── Divider ──
      y = Math.max(y, metaY) + 10;
      doc.moveTo(PAD, y).lineTo(W - PAD, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 12;

      // ── Bill To ──
      doc.fontSize(8).fillColor(LGRAY).font('Helvetica-Bold').text('BILL TO', PAD, y);
      y += 13;
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(invoice.customerName || 'N/A', PAD, y, { width: 300 });
      y += 17;
      if (invoice.customerGstin) {
        doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(`GSTIN: ${invoice.customerGstin}`, PAD, y); y += 13;
      }
      if (invoice.customerAddress) {
        doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(invoice.customerAddress, PAD, y, { width: 300 }); y += 13;
      }
      y += 10;

      // ── Items Table ──
      // Column x positions
      const C = {
        no:   PAD,
        name: PAD + 18,
        hsn:  PAD + 175,
        qty:  PAD + 245,
        rate: PAD + 305,
        disc: PAD + 365,
        gst:  PAD + 405,
        amt:  PAD + 445,
      };
      const ROW_H = 20;
      const HDR_H = 22;

      // Header row
      doc.rect(PAD, y, CONTENT_W, HDR_H).fill(DARK);
      doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold');
      doc.text('#',      C.no,   y + 7);
      doc.text('Item',   C.name, y + 7);
      doc.text('HSN',    C.hsn,  y + 7);
      doc.text('Qty',    C.qty,  y + 7, { width: 56, align: 'right' });
      doc.text('Rate',   C.rate, y + 7, { width: 56, align: 'right' });
      doc.text('Disc%',  C.disc, y + 7, { width: 36, align: 'right' });
      doc.text('GST%',   C.gst,  y + 7, { width: 36, align: 'right' });
      doc.text('Amount', C.amt,  y + 7, { width: 67, align: 'right' });
      y += HDR_H;

      // Item rows
      (invoice.items || []).forEach((item, i) => {
        doc.rect(PAD, y, CONTENT_W, ROW_H).fill(i % 2 === 0 ? WHITE : BGALT);
        doc.fontSize(8).fillColor(DARK).font('Helvetica');
        doc.text(String(i + 1), C.no, y + 6);
        doc.font('Helvetica-Bold').text(item.name || '', C.name, y + 6, { width: 152, ellipsis: true });
        doc.font('Helvetica').fillColor(LGRAY).text(item.hsnCode || '-', C.hsn, y + 6, { width: 64 });
        doc.fillColor(DARK).text(`${item.quantity || 0} ${item.unit || ''}`, C.qty, y + 6, { width: 56, align: 'right' });
        doc.text(fmt(item.rate), C.rate, y + 6, { width: 56, align: 'right' });
        doc.text(`${item.discount || 0}%`, C.disc, y + 6, { width: 36, align: 'right' });
        doc.text(`${item.gstRate || 0}%`, C.gst, y + 6, { width: 36, align: 'right' });
        doc.font('Helvetica-Bold').text(fmt(item.amount), C.amt, y + 6, { width: 67, align: 'right' });
        y += ROW_H;
      });

      y += 16;

      // ── GST Breakup ──
      const gstBreakup = (invoice.items || []).reduce((acc, item) => {
        if (!item.gstRate) return acc;
        const key = `${item.gstRate}%`;
        if (!acc[key]) acc[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        acc[key].taxable += item.quantity * item.rate * (1 - (item.discount || 0) / 100);
        acc[key].cgst += item.cgst || 0;
        acc[key].sgst += item.sgst || 0;
        acc[key].igst += item.igst || 0;
        return acc;
      }, {});

      const hasGST = Object.keys(gstBreakup).length > 0;
      const totalsX = hasGST ? W - PAD - 200 : W - PAD - 200;
      const gstTableW = hasGST ? totalsX - PAD - 16 : 0;

      if (hasGST) {
        let gy = y;
        doc.fontSize(8).fillColor(LGRAY).font('Helvetica-Bold').text('GST BREAKUP', PAD, gy);
        gy += 12;

        // GST header
        const gCols = invoice.isInterState
          ? ['Rate', 'Taxable', 'IGST', 'Total']
          : ['Rate', 'Taxable', 'CGST', 'SGST', 'Total'];
        const gColW = gstTableW / gCols.length;
        doc.rect(PAD, gy, gstTableW, 18).fill(BGLIGHT);
        doc.fontSize(8).fillColor(DARK).font('Helvetica-Bold');
        gCols.forEach((h, i) => {
          doc.text(h, PAD + i * gColW, gy + 5, { width: gColW, align: i === 0 ? 'left' : 'right' });
        });
        gy += 18;

        Object.entries(gstBreakup).forEach(([rate, v], i) => {
          doc.rect(PAD, gy, gstTableW, 16).fill(i % 2 === 0 ? WHITE : BGALT);
          doc.fontSize(8).fillColor(DARK).font('Helvetica');
          const vals = invoice.isInterState
            ? [rate, fmt(v.taxable), fmt(v.igst), fmt(v.cgst + v.sgst + v.igst)]
            : [rate, fmt(v.taxable), fmt(v.cgst), fmt(v.sgst), fmt(v.cgst + v.sgst + v.igst)];
          vals.forEach((val, j) => {
            doc.text(val, PAD + j * gColW, gy + 4, { width: gColW, align: j === 0 ? 'left' : 'right' });
          });
          gy += 16;
        });
      }

      // ── Totals ──
      const totals = [
        { label: 'Subtotal', value: fmt(invoice.subtotal), color: DARK },
        ...(invoice.totalDiscount > 0 ? [{ label: 'Discount', value: `-${fmt(invoice.totalDiscount)}`, color: '#dc2626' }] : []),
        ...(!invoice.isInterState
          ? [{ label: 'CGST', value: fmt(invoice.totalCgst), color: GRAY }, { label: 'SGST', value: fmt(invoice.totalSgst), color: GRAY }]
          : [{ label: 'IGST', value: fmt(invoice.totalIgst), color: GRAY }]),
        ...(invoice.shipping > 0 ? [{ label: 'Shipping', value: fmt(invoice.shipping), color: GRAY }] : []),
      ];

      let ty = y;
      totals.forEach(({ label, value, color }) => {
        doc.fontSize(9).fillColor(LGRAY).font('Helvetica').text(label, totalsX, ty, { width: 110 });
        doc.fillColor(color).text(value, totalsX + 110, ty, { width: 80, align: 'right' });
        ty += 14;
      });

      // Grand Total box
      doc.rect(totalsX - 4, ty, 194, 24).fill(DARK);
      doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold').text('Grand Total', totalsX, ty + 7, { width: 110 });
      doc.fillColor('#4ade80').text(fmt(invoice.grandTotal), totalsX + 110, ty + 7, { width: 80, align: 'right' });
      ty += 30;

      // Paid box
      doc.rect(totalsX - 4, ty, 194, 20).fill('#f0fdf4');
      doc.fontSize(9).fillColor(GREEN).font('Helvetica-Bold').text('Paid', totalsX, ty + 6, { width: 110 });
      doc.text(fmt(invoice.paidAmount), totalsX + 110, ty + 6, { width: 80, align: 'right' });
      ty += 26;

      // Balance Due box
      const isDue = (invoice.dueAmount || 0) > 0;
      doc.rect(totalsX - 4, ty, 194, 20).fill(isDue ? '#fef2f2' : '#f0fdf4');
      doc.fontSize(10).fillColor(isDue ? '#dc2626' : GREEN).font('Helvetica-Bold')
        .text('Balance Due', totalsX, ty + 5, { width: 110 });
      doc.text(fmt(invoice.dueAmount), totalsX + 110, ty + 5, { width: 80, align: 'right' });
      ty += 30;

      y = Math.max(ty, y) + 10;

      // ── Notes ──
      if (invoice.notes) {
        doc.rect(PAD, y, CONTENT_W, 28).fill('#fffbeb');
        doc.fontSize(9).fillColor('#92400e').font('Helvetica-Bold').text('Notes: ', PAD + 6, y + 9, { continued: true });
        doc.font('Helvetica').fillColor('#78350f').text(invoice.notes, { width: CONTENT_W - 60 });
        y += 36;
      }

      // ── Footer ──
      y += 8;
      doc.moveTo(PAD, y).lineTo(W - PAD, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 10;
      doc.fontSize(9).fillColor(LGRAY).font('Helvetica')
        .text('Payment Mode: ', PAD, y, { continued: true })
        .font('Helvetica-Bold').fillColor(DARK).text((invoice.paymentMode || 'cash').toUpperCase());
      doc.fontSize(8).fillColor(LGRAY).font('Helvetica')
        .text('This is a computer-generated invoice.', PAD, y + 14);

      // Signatory
      const sigX = W - PAD - 160;
      doc.moveTo(sigX, y + 52).lineTo(W - PAD, y + 52).strokeColor(LGRAY).lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor(LGRAY).font('Helvetica')
        .text('Authorised Signatory', sigX, y + 56, { width: 160, align: 'center' });
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
        .text(b.name || '', sigX, y + 68, { width: 160, align: 'center' });

      // ── Bottom green bar ──
      doc.rect(0, H - 7, W, 7).fill(GREEN);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateInvoicePDF;
