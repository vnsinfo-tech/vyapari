const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Business = require('../models/Business');
const StockAdjustment = require('../models/StockAdjustment');
const PDFDocument = require('pdfkit');

const calcGST = (amount, gstRate, isInterState) => {
  const tax = (amount * gstRate) / 100;
  return isInterState ? { cgst: 0, sgst: 0, igst: tax } : { cgst: tax / 2, sgst: tax / 2, igst: 0 };
};

exports.getInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, startDate, endDate, sort = '-invoiceDate' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false };
    if (search) query.$or = [{ invoiceNumber: new RegExp(search, 'i') }, { customerName: new RegExp(search, 'i') }];
    if (status) query.status = status;
    if (startDate || endDate) query.invoiceDate = {};
    if (startDate) query.invoiceDate.$gte = new Date(startDate);
    if (endDate) query.invoiceDate.$lte = new Date(endDate);
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort(sort).skip((page - 1) * limit).limit(+limit).populate('customer', 'name phone'),
      Invoice.countDocuments(query),
    ]);
    res.json({ invoices, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.user.business._id })
      .populate('customer').populate('items.product');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const business = await Business.findById(req.user.business._id);
    const invoiceNumber = `${business.invoicePrefix}-${String(business.invoiceCounter).padStart(4, '0')}`;
    const { items, isInterState = false, ...rest } = req.body;
    if (rest.customer === '') delete rest.customer;
    let subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
    const processedItems = items.map(item => {
      const lineTotal = item.quantity * item.rate;
      const discountAmt = (lineTotal * (item.discount || 0)) / 100;
      const taxable = lineTotal - discountAmt;
      const gst = calcGST(taxable, item.gstRate || 0, isInterState);
      subtotal += taxable; totalDiscount += discountAmt;
      totalCgst += gst.cgst; totalSgst += gst.sgst; totalIgst += gst.igst;
      return { ...item, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, amount: taxable + gst.cgst + gst.sgst + gst.igst };
    });
    const totalTax = totalCgst + totalSgst + totalIgst;
    const grandTotal = subtotal + totalTax + (rest.shipping || 0);
    const dueAmount = grandTotal - (rest.paidAmount || 0);
    const invoice = await Invoice.create({
      ...rest, customer: rest.customer || undefined, business: business._id, invoiceNumber, items: processedItems,
      subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, totalTax, grandTotal, dueAmount, isInterState,
      status: dueAmount <= 0 ? 'paid' : rest.paidAmount > 0 ? 'partial' : 'sent',
    });
    for (const item of processedItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        await StockAdjustment.create({ business: business._id, product: item.product, type: 'out', quantity: item.quantity, reason: 'Sale', reference: invoiceNumber, createdBy: req.user._id });
      }
    }
    business.invoiceCounter += 1;
    await business.save();
    res.status(201).json(invoice);
  } catch (err) { next(err); }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const { items, isInterState = false, ...rest } = req.body;
    if (rest.customer === '') delete rest.customer;
    
    const updateData = { ...rest, isInterState };
    let subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

    if (items && Array.isArray(items)) {
      const processedItems = items.map(item => {
        const lineTotal = item.quantity * item.rate;
        const discountAmt = (lineTotal * (item.discount || 0)) / 100;
        const taxable = lineTotal - discountAmt;
        const gst = calcGST(taxable, item.gstRate || 0, isInterState);
        subtotal += taxable;
        totalDiscount += discountAmt;
        totalCgst += gst.cgst;
        totalSgst += gst.sgst;
        totalIgst += gst.igst;
        return { ...item, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, amount: taxable + gst.cgst + gst.sgst + gst.igst };
      });
      updateData.items = processedItems;
      updateData.subtotal = subtotal;
      updateData.totalDiscount = totalDiscount;
      updateData.totalCgst = totalCgst;
      updateData.totalSgst = totalSgst;
      updateData.totalIgst = totalIgst;
      updateData.totalTax = totalCgst + totalSgst + totalIgst;
      updateData.grandTotal = subtotal + (totalCgst + totalSgst + totalIgst) + (updateData.shipping || 0);
      updateData.dueAmount = updateData.grandTotal - (updateData.paidAmount || 0);
      updateData.status = updateData.dueAmount <= 0 ? 'paid' : updateData.paidAmount > 0 ? 'partial' : 'sent';
      updateData.isInterState = isInterState;
    } else {
      // If items are not provided but shipping or paidAmount is, we'd need to recalculate from existing invoice
      // But typically the frontend sends everything in a PUT request.
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id },
      updateData, { new: true, runValidators: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    await Invoice.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, { isDeleted: true });
    res.json({ message: 'Invoice deleted' });
  } catch (err) { next(err); }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.user.business._id })
      .populate('customer').populate('business');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const b = invoice.business || {};
    // PDFKit built-in Helvetica does NOT support ₹ (U+20B9) — renders as "1"
    // Use "Rs." instead in PDF
    const fmt = (n) => `Rs.${(n || 0).toFixed(2)}`;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    // GST breakup
    const gstBreakup = {};
    invoice.items.forEach(item => {
      const key = `${item.gstRate}%`;
      if (!gstBreakup[key]) gstBreakup[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      const lineTotal = item.quantity * item.rate * (1 - (item.discount || 0) / 100);
      gstBreakup[key].taxable += lineTotal;
      gstBreakup[key].cgst += item.cgst || 0;
      gstBreakup[key].sgst += item.sgst || 0;
      gstBreakup[key].igst += item.igst || 0;
    });
    const gstKeys = Object.keys(gstBreakup);

    const totalsRows = [
      { label: 'Subtotal', value: fmt(invoice.subtotal), color: '#374151' },
      ...(invoice.totalDiscount > 0 ? [{ label: 'Discount', value: `-${fmt(invoice.totalDiscount)}`, color: '#dc2626' }] : []),
      ...(!invoice.isInterState
        ? [{ label: 'CGST', value: fmt(invoice.totalCgst), color: '#6b7280' },
           { label: 'SGST', value: fmt(invoice.totalSgst), color: '#6b7280' }]
        : [{ label: 'IGST', value: fmt(invoice.totalIgst), color: '#6b7280' }]),
      ...(invoice.shipping > 0 ? [{ label: 'Shipping', value: fmt(invoice.shipping), color: '#6b7280' }] : []),
    ];

    const statusColors = { paid: '#16a34a', partial: '#d97706', overdue: '#dc2626', sent: '#2563eb', draft: '#6b7280', cancelled: '#6b7280' };
    const statusBg = statusColors[invoice.status] || '#6b7280';

    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Invoice_${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    const PW = 595, PH = 842, ML = 36, MR = 36;
    const CW = PW - ML - MR;
    let y = 0;

    // ── Top green accent bar ──
    doc.rect(0, 0, PW, 6).fill('#16a34a');
    y = 18;

    // ── Header ──
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#111111').text(b.name || 'Business Name', ML, y, { width: 300 });
    let leftY = y + 26;
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    const addrParts = [b.address?.line1, b.address?.city, b.address?.state, b.address?.pincode].filter(Boolean);
    if (addrParts.length) { doc.text(addrParts.join(', '), ML, leftY, { width: 300 }); leftY += 13; }
    if (b.phone) { doc.text(`Phone: ${b.phone}`, ML, leftY, { width: 300 }); leftY += 13; }
    if (b.email) { doc.text(`Email: ${b.email}`, ML, leftY, { width: 300 }); leftY += 13; }
    if (b.gstin) { doc.font('Helvetica-Bold').fillColor('#374151').text(`GSTIN: ${b.gstin}`, ML, leftY, { width: 300 }); leftY += 13; }

    // Right: TAX INVOICE badge
    const RX = PW - MR - 160;
    doc.roundedRect(RX, 18, 160, 26, 4).fill('#16a34a');
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold').text('TAX INVOICE', RX, 25, { width: 160, align: 'center' });

    // Status badge
    doc.roundedRect(RX, 50, 160, 18, 3).fill(statusBg);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text((invoice.status || '').toUpperCase(), RX, 55, { width: 160, align: 'center' });

    // Invoice meta
    let metaY = 74;
    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af');
    doc.text('Invoice No:', RX, metaY, { width: 65 });
    doc.font('Helvetica-Bold').fillColor('#111111').text(invoice.invoiceNumber, RX + 68, metaY, { width: 92 }); metaY += 14;
    doc.font('Helvetica').fillColor('#9ca3af').text('Date:', RX, metaY, { width: 65 });
    doc.font('Helvetica-Bold').fillColor('#111111').text(fmtDate(invoice.invoiceDate), RX + 68, metaY, { width: 92 }); metaY += 14;
    if (invoice.dueDate) {
      doc.font('Helvetica').fillColor('#9ca3af').text('Due Date:', RX, metaY, { width: 65 });
      doc.font('Helvetica-Bold').fillColor('#dc2626').text(fmtDate(invoice.dueDate), RX + 68, metaY, { width: 92 }); metaY += 14;
    }

    y = Math.max(leftY, metaY) + 10;

    // ── Divider ──
    doc.moveTo(ML, y).lineTo(PW - MR, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 14;

    // ── Bill To ──
    doc.rect(ML, y, CW, 16).fill('#f9fafb');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('BILL TO', ML + 10, y + 4);
    y += 16;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#111111').text(invoice.customerName || 'N/A', ML + 10, y);
    y += 19;
    if (invoice.customerGstin) { doc.fontSize(9).font('Helvetica').fillColor('#555555').text(`GSTIN: ${invoice.customerGstin}`, ML + 10, y); y += 13; }
    if (invoice.customerAddress) { doc.fontSize(9).fillColor('#777777').text(invoice.customerAddress, ML + 10, y, { width: CW - 20 }); y += 13; }
    y += 10;

    // ── Items Table ──
    const C = { num: ML, name: ML+20, hsn: ML+200, qty: ML+268, rate: ML+318, disc: ML+372, gst: ML+412, amt: ML+450 };

    doc.rect(ML, y, CW, 24).fill('#1f2937');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('#',      C.num,  y+8, { width: 18 });
    doc.text('Item',   C.name, y+8, { width: 175 });
    doc.text('HSN',    C.hsn,  y+8, { width: 46 });
    doc.text('Qty',    C.qty,  y+8, { width: 48,  align: 'right' });
    doc.text('Rate',   C.rate, y+8, { width: 52,  align: 'right' });
    doc.text('Disc%',  C.disc, y+8, { width: 38,  align: 'right' });
    doc.text('GST%',   C.gst,  y+8, { width: 36,  align: 'right' });
    doc.text('Amount', C.amt,  y+8, { width: 73,  align: 'right' });
    y += 24;

    invoice.items.forEach((item, i) => {
      doc.rect(ML, y, CW, 22).fill(i % 2 === 0 ? '#ffffff' : '#f9fafb');
      doc.moveTo(ML, y+22).lineTo(PW-MR, y+22).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(String(i+1), C.num, y+7, { width: 18 });
      doc.font('Helvetica-Bold').fillColor('#111111').text(item.name, C.name, y+7, { width: 175 });
      doc.font('Helvetica').fillColor('#9ca3af').text(item.hsnCode || '-', C.hsn, y+7, { width: 46 });
      doc.fillColor('#374151').text(`${item.quantity} ${item.unit||''}`, C.qty, y+7, { width: 48, align: 'right' });
      doc.text(fmt(item.rate), C.rate, y+7, { width: 52, align: 'right' });
      doc.text(`${item.discount||0}%`, C.disc, y+7, { width: 38, align: 'right' });
      doc.text(`${item.gstRate}%`, C.gst, y+7, { width: 36, align: 'right' });
      doc.font('Helvetica-Bold').fillColor('#111111').text(fmt(item.amount), C.amt, y+7, { width: 73, align: 'right' });
      y += 22;
    });
    y += 14;

    // ── GST Breakup (left) + Totals (right) ──
    const sectionY = y;
    const gstW = 290, totX = ML + gstW + 20, totW = CW - gstW - 20;

    if (gstKeys.length > 0) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('GST BREAKUP', ML, y);
      y += 12;
      doc.rect(ML, y, gstW, 20).fill('#f3f4f6');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
      doc.text('Rate',    ML+6,   y+6, { width: 44 });
      doc.text('Taxable', ML+54,  y+6, { width: 68, align: 'right' });
      if (!invoice.isInterState) {
        doc.text('CGST', ML+126, y+6, { width: 54, align: 'right' });
        doc.text('SGST', ML+184, y+6, { width: 54, align: 'right' });
      } else {
        doc.text('IGST', ML+126, y+6, { width: 108, align: 'right' });
      }
      doc.text('Total', ML+242, y+6, { width: 44, align: 'right' });
      y += 20;
      gstKeys.forEach((rate, ri) => {
        const v = gstBreakup[rate];
        doc.rect(ML, y, gstW, 18).fill(ri % 2 === 0 ? '#ffffff' : '#f9fafb');
        doc.moveTo(ML, y+18).lineTo(ML+gstW, y+18).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        doc.fontSize(9).font('Helvetica').fillColor('#374151');
        doc.text(rate,           ML+6,   y+5, { width: 44 });
        doc.text(fmt(v.taxable), ML+54,  y+5, { width: 68, align: 'right' });
        if (!invoice.isInterState) {
          doc.text(fmt(v.cgst), ML+126, y+5, { width: 54, align: 'right' });
          doc.text(fmt(v.sgst), ML+184, y+5, { width: 54, align: 'right' });
        } else {
          doc.text(fmt(v.igst), ML+126, y+5, { width: 108, align: 'right' });
        }
        doc.font('Helvetica-Bold').text(fmt(v.cgst+v.sgst+v.igst), ML+242, y+5, { width: 44, align: 'right' });
        y += 18;
      });
    }

    // Totals right column
    let ty = sectionY;
    totalsRows.forEach(({ label, value, color }) => {
      doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(label, totX, ty, { width: totW - 10 });
      doc.fillColor(color).text(value, totX, ty, { width: totW, align: 'right' });
      doc.moveTo(totX, ty+13).lineTo(totX+totW, ty+13).strokeColor('#f3f4f6').lineWidth(0.5).stroke();
      ty += 16;
    });

    // Grand Total dark box
    doc.rect(totX, ty, totW, 28).fill('#1f2937');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('Grand Total', totX+6, ty+8, { width: totW-12 });
    doc.fillColor('#4ade80').text(fmt(invoice.grandTotal), totX+6, ty+8, { width: totW-12, align: 'right' });
    ty += 28;

    // Paid green box
    doc.rect(totX, ty, totW, 20).fill('#f0fdf4');
    doc.moveTo(totX, ty).lineTo(totX+totW, ty).strokeColor('#bbf7d0').lineWidth(1).stroke();
    doc.moveTo(totX, ty+20).lineTo(totX+totW, ty+20).strokeColor('#bbf7d0').lineWidth(1).stroke();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#16a34a').text('Paid', totX+6, ty+6, { width: totW-12 });
    doc.text(fmt(invoice.paidAmount), totX+6, ty+6, { width: totW-12, align: 'right' });
    ty += 20;

    // Balance Due box
    const dueColor = invoice.dueAmount > 0 ? '#dc2626' : '#16a34a';
    const dueBg    = invoice.dueAmount > 0 ? '#fef2f2' : '#f0fdf4';
    const dueBdr   = invoice.dueAmount > 0 ? '#fecaca' : '#bbf7d0';
    doc.rect(totX, ty, totW, 22).fill(dueBg);
    doc.moveTo(totX, ty).lineTo(totX+totW, ty).strokeColor(dueBdr).lineWidth(1).stroke();
    doc.moveTo(totX, ty+22).lineTo(totX+totW, ty+22).strokeColor(dueBdr).lineWidth(1).stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor(dueColor).text('Balance Due', totX+6, ty+6, { width: totW-12 });
    doc.text(fmt(invoice.dueAmount), totX+6, ty+6, { width: totW-12, align: 'right' });
    ty += 22;

    y = Math.max(y, ty) + 16;

    // ── Notes ──
    if (invoice.notes) {
      doc.rect(ML, y, CW, 26).fill('#fffbeb');
      doc.moveTo(ML, y).lineTo(PW-MR, y).strokeColor('#fde68a').lineWidth(1).stroke();
      doc.moveTo(ML, y+26).lineTo(PW-MR, y+26).strokeColor('#fde68a').lineWidth(1).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#92400e').text('Notes: ', ML+10, y+8, { continued: true });
      doc.font('Helvetica').fillColor('#78350f').text(invoice.notes, { width: CW-20 });
      y += 34;
    }

    // ── Footer ──
    doc.moveTo(ML, y).lineTo(PW-MR, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 12;
    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text('Payment Mode: ', ML, y, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#374151').text((invoice.paymentMode || '').toUpperCase());
    y += 14;
    doc.font('Helvetica').fillColor('#9ca3af').text('This is a computer-generated invoice.', ML, y);

    const sigX = PW - MR - 152;
    doc.moveTo(sigX, y+32).lineTo(PW-MR, y+32).strokeColor('#9ca3af').lineWidth(0.5).stroke();
    doc.fontSize(8).fillColor('#9ca3af').text('Authorised Signatory', sigX, y+35, { width: 152, align: 'center' });
    doc.font('Helvetica-Bold').fillColor('#374151').text(b.name || '', sigX, y+46, { width: 152, align: 'center' });

    // ── Bottom green accent bar ──
    doc.rect(0, PH-6, PW, 6).fill('#16a34a');

    doc.end();
  } catch (err) { next(err); }
};
