`const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Business = require('../models/Business');
const StockAdjustment = require('../models/StockAdjustment');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const calcGST = (amount, gstRate, isInterState) => {
  const tax = (amount * gstRate) / 100;
  return isInterState
    ? { cgst: 0, sgst: 0, igst: tax }
    : { cgst: tax / 2, sgst: tax / 2, igst: 0 };
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
      Invoice.find(query).sort(sort).skip((page - 1) * limit).limit(+limit).populate('customer', 'name phone').lean(),
      Invoice.countDocuments(query),
    ]);
    res.json({ invoices, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.user.business._id })
      .populate('customer').populate('items.product').lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const business = await Business.findById(req.user.business._id);
    const invoiceNumber = `${business.invoicePrefix}-${String(business.invoiceCounter).padStart(4, '0')}`;

    const { items, isInterState = false, ...rest } = req.body;
    // Fix empty customer
    if (rest.customer === '') {
      delete rest.customer;
    }
    let subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

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

    const totalTax = totalCgst + totalSgst + totalIgst;
    const grandTotal = subtotal + totalTax + (rest.shipping || 0);
    const dueAmount = grandTotal - (rest.paidAmount || 0);

    const invoice = await Invoice.create({
      ...rest, business: business._id, invoiceNumber, items: processedItems,
      subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, totalTax, grandTotal, dueAmount, isInterState,
      status: dueAmount <= 0 ? 'paid' : rest.paidAmount > 0 ? 'partial' : 'sent',
    });

    // Reduce stock
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
    const { items, isInterState = false, shipping, paidAmount, paymentMode, notes, customer, customerName, customerGstin, customerAddress, dueDate, invoiceDate, ...simpleUpdate } = req.body;
    const updateData = { ...simpleUpdate, isInterState };
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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    const b = invoice.business;
    doc.fontSize(20).text(b.name || 'Business Name', { align: 'center' });
    doc.fontSize(10).text(`GSTIN: ${b.gstin || 'N/A'} | Phone: ${b.phone || 'N/A'}`, { align: 'center' });
    doc.moveDown().fontSize(14).text('TAX INVOICE', { align: 'center', underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Invoice No: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`);
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}`);
    doc.moveDown();
    doc.text(`Bill To: ${invoice.customerName || 'N/A'}`);
    if (invoice.customerGstin) doc.text(`GSTIN: ${invoice.customerGstin}`);
    doc.moveDown();

    // Items table header
    doc.font('Helvetica-Bold').text('Item', 40, doc.y, { width: 180 });
    doc.text('Qty', 220, doc.y - doc.currentLineHeight(), { width: 50 });
    doc.text('Rate', 270, doc.y - doc.currentLineHeight(), { width: 70 });
    doc.text('GST%', 340, doc.y - doc.currentLineHeight(), { width: 50 });
    doc.text('Amount', 390, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.font('Helvetica').moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

    invoice.items.forEach(item => {
      const y = doc.y;
      doc.text(item.name, 40, y, { width: 180 });
      doc.text(String(item.quantity), 220, y, { width: 50 });
      doc.text(`₹${item.rate}`, 270, y, { width: 70 });
      doc.text(`${item.gstRate}%`, 340, y, { width: 50 });
      doc.text(`₹${item.amount.toFixed(2)}`, 390, y, { width: 80 });
      doc.moveDown();
    });

    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke().moveDown(0.5);
    doc.font('Helvetica-Bold');
    doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, { align: 'right' });
    if (!invoice.isInterState) {
      doc.text(`CGST: ₹${invoice.totalCgst.toFixed(2)}`, { align: 'right' });
      doc.text(`SGST: ₹${invoice.totalSgst.toFixed(2)}`, { align: 'right' });
    } else {
      doc.text(`IGST: ₹${invoice.totalIgst.toFixed(2)}`, { align: 'right' });
    }
    if (invoice.shipping) doc.text(`Shipping: ₹${invoice.shipping.toFixed(2)}`, { align: 'right' });
    doc.fontSize(12).text(`Grand Total: ₹${invoice.grandTotal.toFixed(2)}`, { align: 'right' });
    doc.fontSize(10).text(`Paid: ₹${invoice.paidAmount.toFixed(2)} | Due: ₹${invoice.dueAmount.toFixed(2)}`, { align: 'right' });
    if (invoice.notes) { doc.moveDown().font('Helvetica').text(`Notes: ${invoice.notes}`); }

    // QR Code
    const qrData = `Invoice: ${invoice.invoiceNumber} | Total: ₹${invoice.grandTotal}`;
    const qrBuffer = await QRCode.toBuffer(qrData);
    doc.moveDown().image(qrBuffer, { width: 80 });
    
    doc.end();
  } catch (err) { next(err); }
};

