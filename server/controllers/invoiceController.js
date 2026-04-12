const Invoice = require('../models/Invoice');
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
    const { page = 1, limit = 20, search, status, startDate, endDate } = req.query;
    const sort = req.query.sort === 'invoiceDate' ? 'invoiceDate' : '-invoiceDate';
    const query = { business: req.user.business._id, isDeleted: false };
    if (search) query.$or = [{ invoiceNumber: new RegExp(search, 'i') }, { customerName: new RegExp(search, 'i') }];
    if (status && ['draft','sent','paid','partial','overdue','cancelled'].includes(status)) query.status = status;
    if (startDate || endDate) query.invoiceDate = {};
    if (startDate) query.invoiceDate.$gte = new Date(startDate);
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.invoiceDate.$lte = end; }

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
    if (rest.customer === '') delete rest.customer;

    // Stock validation
    for (const item of items) {
      if (item.product) {
        const product = await Product.findById(item.product);
        const qty = parseInt(item.quantity || 0);
        if (product && qty > product.stock) {
          return res.status(400).json({ message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}` });
        }
      }
    }

    let subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

    const processedItems = items.map(item => {
      const qty = parseInt(item.quantity || 0);
      const rate = parseFloat(item.rate || 0);
      const lineTotal = qty * rate;
      const discount = parseFloat(item.discount || 0);
      const discountAmt = (lineTotal * discount) / 100;
      const taxable = lineTotal - discountAmt;
      const gstRate = parseFloat(item.gstRate || 0);
      const gst = calcGST(taxable, gstRate, isInterState);
      subtotal += taxable;
      totalDiscount += discountAmt;
      totalCgst += gst.cgst;
      totalSgst += gst.sgst;
      totalIgst += gst.igst;
      return { ...item, quantity: qty, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, amount: Number((taxable + gst.cgst + gst.sgst + gst.igst).toFixed(2)) };
    });

    const totalTax = Number((totalCgst + totalSgst + totalIgst).toFixed(2));
    const shippingAmt = parseFloat(rest.shipping || 0);
    const paidAmt = parseFloat(rest.paidAmount || 0);
    const grandTotal = Number((subtotal + totalTax + shippingAmt).toFixed(2));
    const dueAmount = Number((grandTotal - paidAmt).toFixed(2));

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
    const existingInvoice = await Invoice.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!existingInvoice) return res.status(404).json({ message: 'Invoice not found' });

    const { items, isInterState = false, shipping, paidAmount, paymentMode, notes, customer, customerName, customerGstin, customerAddress, dueDate, invoiceDate, ...simpleUpdate } = req.body;
    const updateData = { ...simpleUpdate, isInterState };
    let subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

    if (items && Array.isArray(items) && items.length > 0) {
      // Stock validation: available = current stock + old qty (already deducted)
      for (const item of items) {
        if (item.product) {
          const product = await Product.findById(item.product);
          const newQty = parseInt(item.quantity || 0);
          const oldItem = existingInvoice.items.find(oi => String(oi.product) === String(item.product));
          const oldQty = oldItem ? oldItem.quantity : 0;
          const availableStock = (product?.stock ?? 0) + oldQty;
          if (product && newQty > availableStock) {
            return res.status(400).json({ message: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${newQty}` });
          }
        }
      }

      const processedItems = items.map(item => {
        const qty = parseInt(item.quantity || 0);
        const rate = parseFloat(item.rate || 0);
        const lineTotal = qty * rate;
        const discount = parseFloat(item.discount || 0);
        const discountAmt = (lineTotal * discount) / 100;
        const taxable = lineTotal - discountAmt;
        const gstRate = parseFloat(item.gstRate || 0);
        const gst = calcGST(taxable, gstRate, isInterState);
        subtotal += taxable;
        totalDiscount += discountAmt;
        totalCgst += gst.cgst;
        totalSgst += gst.sgst;
        totalIgst += gst.igst;
        return { ...item, quantity: qty, cgst: gst.cgst, sgst: gst.sgst, igst: gst.igst, amount: Number((taxable + gst.cgst + gst.sgst + gst.igst).toFixed(2)) };
      });

      // Adjust stock difference
      for (const newItem of processedItems) {
        if (newItem.product) {
          const oldItem = existingInvoice.items.find(oi => String(oi.product) === String(newItem.product));
          const oldQty = oldItem ? oldItem.quantity : 0;
          const diff = newItem.quantity - oldQty;
          if (diff !== 0) {
            await Product.findByIdAndUpdate(newItem.product, { $inc: { stock: -diff } });
            await StockAdjustment.create({ business: req.user.business._id, product: newItem.product, type: diff > 0 ? 'out' : 'in', quantity: Math.abs(diff), reason: 'Invoice Updated', reference: existingInvoice.invoiceNumber, createdBy: req.user._id });
          }
        }
      }

      updateData.items = processedItems;
      updateData.subtotal = subtotal;
      updateData.totalDiscount = totalDiscount;
      updateData.totalCgst = totalCgst;
      updateData.totalSgst = totalSgst;
      updateData.totalIgst = totalIgst;
      updateData.totalTax = Number((totalCgst + totalSgst + totalIgst).toFixed(2));
      const shippingAmt = parseFloat(shipping || 0);
      const paidAmt = parseFloat(paidAmount || 0);
      updateData.grandTotal = Number((subtotal + updateData.totalTax + shippingAmt).toFixed(2));
      updateData.dueAmount = Number((updateData.grandTotal - paidAmt).toFixed(2));
      updateData.status = updateData.dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'sent';
    }

    if (shipping !== undefined) updateData.shipping = parseFloat(shipping || 0);
    if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount || 0);
    if (paymentMode) updateData.paymentMode = paymentMode;
    if (notes !== undefined) updateData.notes = notes;
    if (customer !== undefined) updateData.customer = customer || null;
    if (customerName) updateData.customerName = customerName;
    if (customerGstin !== undefined) updateData.customerGstin = customerGstin;
    if (customerAddress !== undefined) updateData.customerAddress = customerAddress;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (invoiceDate) updateData.invoiceDate = invoiceDate;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, business: req.user.business._id },
      updateData, { new: true, runValidators: true }
    );
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, business: req.user.business._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Restore stock on cancel/delete
    for (const item of invoice.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        await StockAdjustment.create({ business: req.user.business._id, product: item.product, type: 'in', quantity: item.quantity, reason: 'Invoice Cancelled', reference: invoice.invoiceNumber, createdBy: req.user._id });
      }
    }

    await invoice.updateOne({ isDeleted: true });
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
