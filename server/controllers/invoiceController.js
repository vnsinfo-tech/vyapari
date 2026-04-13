const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Business = require('../models/Business');
const StockAdjustment = require('../models/StockAdjustment');

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

exports.downloadPublicPDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false })
      .populate('business', 'name address phone email gstin')
      .lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    // Serve printable HTML — user can Print → Save as PDF from browser
    res.setHeader('Content-Type', 'text/html');
    res.send(buildInvoiceHTML(invoice));
  } catch (err) { next(err); }
};

exports.getPublicInvoice = async (req, res, next) => {  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false })
      .populate('business', 'name address phone email gstin')
      .lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const { _id, invoiceNumber, invoiceDate, dueDate, status, isInterState, paymentMode, notes,
      customerName, customerGstin, customerAddress,
      items, subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, shipping, grandTotal, paidAmount, dueAmount,
      business } = invoice;
    res.json({ _id, invoiceNumber, invoiceDate, dueDate, status, isInterState, paymentMode, notes,
      customerName, customerGstin, customerAddress,
      items, subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, shipping, grandTotal, paidAmount, dueAmount,
      business });
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
      .populate('customer').populate('business').lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    // Serve printable HTML — user can Print → Save as PDF from browser
    res.setHeader('Content-Type', 'text/html');
    res.send(buildInvoiceHTML(invoice));
  } catch (err) { next(err); }
};

function buildInvoiceHTML(invoice) {  const b = invoice.business || {};
  const fmt = (n) => `\u20b9${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const STATUS_COLORS = { paid: '#16a34a', partial: '#d97706', overdue: '#dc2626', sent: '#2563eb', draft: '#6b7280', cancelled: '#6b7280' };
  const statusColor = STATUS_COLORS[invoice.status] || '#6b7280';

  const gstBreakup = invoice.items.reduce((acc, item) => {
    if (!item.gstRate) return acc;
    const key = `${item.gstRate}%`;
    if (!acc[key]) acc[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    acc[key].taxable += item.quantity * item.rate * (1 - (item.discount || 0) / 100);
    acc[key].cgst += item.cgst || 0;
    acc[key].sgst += item.sgst || 0;
    acc[key].igst += item.igst || 0;
    return acc;
  }, {});

  const itemRows = invoice.items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 8px;color:#9ca3af">${i + 1}</td>
      <td style="padding:10px 8px;font-weight:600;color:#111">${item.name}</td>
      <td style="padding:10px 8px;color:#9ca3af">${item.hsnCode || '-'}</td>
      <td style="padding:10px 8px;text-align:right">${item.quantity} ${item.unit || ''}</td>
      <td style="padding:10px 8px;text-align:right">${fmt(item.rate)}</td>
      <td style="padding:10px 8px;text-align:right">${item.discount || 0}%</td>
      <td style="padding:10px 8px;text-align:right">${item.gstRate}%</td>
      <td style="padding:10px 8px;text-align:right;font-weight:700">${fmt(item.amount)}</td>
    </tr>`).join('');

  const gstRows = Object.entries(gstBreakup).map(([rate, v], i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};border-top:1px solid #e5e7eb">
      <td style="padding:7px 8px">${rate}</td>
      <td style="padding:7px 8px;text-align:right">${fmt(v.taxable)}</td>
      ${!invoice.isInterState
        ? `<td style="padding:7px 8px;text-align:right">${fmt(v.cgst)}</td><td style="padding:7px 8px;text-align:right">${fmt(v.sgst)}</td>`
        : `<td style="padding:7px 8px;text-align:right">${fmt(v.igst)}</td>`}
      <td style="padding:7px 8px;text-align:right;font-weight:700">${fmt(v.cgst + v.sgst + v.igst)}</td>
    </tr>`).join('');

  const totalsRows = [
    { label: 'Subtotal', value: fmt(invoice.subtotal), color: '#374151' },
    ...(invoice.totalDiscount > 0 ? [{ label: 'Discount', value: `-${fmt(invoice.totalDiscount)}`, color: '#dc2626' }] : []),
    ...(!invoice.isInterState
      ? [{ label: 'CGST', value: fmt(invoice.totalCgst), color: '#6b7280' }, { label: 'SGST', value: fmt(invoice.totalSgst), color: '#6b7280' }]
      : [{ label: 'IGST', value: fmt(invoice.totalIgst), color: '#6b7280' }]),
    ...(invoice.shipping > 0 ? [{ label: 'Shipping', value: fmt(invoice.shipping), color: '#6b7280' }] : []),
  ].map(r => `
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid #f3f4f6">
      <span style="color:#9ca3af">${r.label}</span>
      <span style="color:${r.color};font-weight:500">${r.value}</span>
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#fff}</style>
  </head><body>
  <div style="max-width:794px;margin:0 auto;background:#fff">
    <div style="height:6px;background:#16a34a"></div>
    <div style="padding:28px 36px">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="font-size:22px;font-weight:800;color:#111">${b.name || 'Business Name'}</div>
          <div style="margin-top:6px;font-size:12px;color:#6b7280;line-height:1.6">
            ${b.address ? `<div>${[b.address.line1, b.address.city, b.address.state, b.address.pincode].filter(Boolean).join(', ')}</div>` : ''}
            ${b.phone ? `<div>Phone: ${b.phone}</div>` : ''}
            ${b.email ? `<div>Email: ${b.email}</div>` : ''}
            ${b.gstin ? `<div style="font-weight:600;color:#374151">GSTIN: ${b.gstin}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;min-width:180px">
          <div style="display:inline-block;background:#16a34a;color:#fff;padding:5px 18px;border-radius:5px;font-weight:700;font-size:14px">TAX INVOICE</div>
          <div style="margin-top:6px;display:inline-block;background:${statusColor};color:#fff;padding:2px 12px;border-radius:4px;font-size:10px;font-weight:700">${(invoice.status || '').toUpperCase()}</div>
          <div style="margin-top:8px;font-size:12px;color:#6b7280;line-height:1.8">
            <div><span style="color:#9ca3af">Invoice No: </span><strong style="color:#111">${invoice.invoiceNumber}</strong></div>
            <div><span style="color:#9ca3af">Date: </span><strong style="color:#111">${fmtDate(invoice.invoiceDate)}</strong></div>
            ${invoice.dueDate ? `<div><span style="color:#9ca3af">Due Date: </span><strong style="color:#dc2626">${fmtDate(invoice.dueDate)}</strong></div>` : ''}
          </div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">

      <div style="margin-bottom:20px">
        <div style="background:#f9fafb;padding:4px 10px;display:inline-block;border-radius:3px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Bill To</div>
        <div style="font-size:16px;font-weight:700;color:#111;margin-bottom:4px">${invoice.customerName || 'N/A'}</div>
        ${invoice.customerGstin ? `<div style="font-size:12px;color:#555">GSTIN: ${invoice.customerGstin}</div>` : ''}
        ${invoice.customerAddress ? `<div style="font-size:12px;color:#777;margin-top:2px">${invoice.customerAddress}</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
        <thead>
          <tr style="background:#1f2937">
            ${['#','Item','HSN','Qty','Rate','Disc%','GST%','Amount'].map((h, i) =>
              `<th style="padding:10px 8px;font-weight:600;color:#fff;text-align:${i >= 3 ? 'right' : 'left'};font-size:11px">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="display:flex;gap:24px;margin-bottom:20px;align-items:flex-start">
        ${Object.keys(gstBreakup).length > 0 ? `
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:8px">GST Breakup</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e5e7eb">
            <thead><tr style="background:#f3f4f6">
              <th style="padding:7px 8px;text-align:left;color:#374151;font-weight:600">Rate</th>
              <th style="padding:7px 8px;text-align:right;color:#374151;font-weight:600">Taxable</th>
              ${!invoice.isInterState
                ? '<th style="padding:7px 8px;text-align:right;color:#374151;font-weight:600">CGST</th><th style="padding:7px 8px;text-align:right;color:#374151;font-weight:600">SGST</th>'
                : '<th style="padding:7px 8px;text-align:right;color:#374151;font-weight:600">IGST</th>'}
              <th style="padding:7px 8px;text-align:right;color:#374151;font-weight:600">Total</th>
            </tr></thead>
            <tbody>${gstRows}</tbody>
          </table>
        </div>` : ''}
        <div style="min-width:230px">
          ${totalsRows}
          <div style="background:#1f2937;border-radius:6px;padding:10px 12px;margin-top:8px;display:flex;justify-content:space-between;align-items:center">
            <span style="color:#fff;font-weight:700;font-size:14px">Grand Total</span>
            <span style="color:#4ade80;font-weight:800;font-size:16px">${fmt(invoice.grandTotal)}</span>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:7px 12px;margin-top:6px;display:flex;justify-content:space-between">
            <span style="color:#16a34a;font-weight:600;font-size:12px">Paid</span>
            <span style="color:#16a34a;font-weight:700;font-size:12px">${fmt(invoice.paidAmount)}</span>
          </div>
          <div style="background:${invoice.dueAmount > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${invoice.dueAmount > 0 ? '#fecaca' : '#bbf7d0'};border-radius:6px;padding:7px 12px;margin-top:6px;display:flex;justify-content:space-between">
            <span style="color:${invoice.dueAmount > 0 ? '#dc2626' : '#16a34a'};font-weight:700;font-size:13px">Balance Due</span>
            <span style="color:${invoice.dueAmount > 0 ? '#dc2626' : '#16a34a'};font-weight:800;font-size:13px">${fmt(invoice.dueAmount)}</span>
          </div>
        </div>
      </div>

      ${invoice.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#78350f"><strong style="color:#92400e">Notes: </strong>${invoice.notes}</div>` : ''}

      <div style="border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end">
        <div style="font-size:11px;color:#9ca3af;line-height:1.8">
          <div>Payment Mode: <strong style="color:#374151;text-transform:uppercase">${invoice.paymentMode}</strong></div>
          <div>This is a computer-generated invoice.</div>
        </div>
        <div style="text-align:center">
          <div style="border-top:1px solid #9ca3af;padding-top:4px;margin-top:36px;width:150px">
            <div style="font-size:10px;color:#9ca3af">Authorised Signatory</div>
            <div style="font-size:11px;font-weight:600;color:#374151">${b.name || ''}</div>
          </div>
        </div>
      </div>
    </div>
    <div style="height:6px;background:#16a34a"></div>
  </div>
  </body></html>`;
}

exports.buildInvoiceHTML = buildInvoiceHTML;
