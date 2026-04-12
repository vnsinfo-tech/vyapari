const Reminder = require('../models/Reminder');
const Invoice = require('../models/Invoice');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

exports.getReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ business: req.user.business._id })
      .sort('-createdAt').limit(50)
      .populate('invoice', 'invoiceNumber');
    res.json(reminders);
  } catch (err) { next(err); }
};

exports.sendReminder = async (req, res, next) => {
  try {
    const { invoiceId, channel = 'email', whatsappNumber } = req.body;
    const invoice = await Invoice.findOne({ _id: invoiceId, business: req.user.business._id })
      .populate('customer').populate('business');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.dueAmount <= 0) return res.status(400).json({ message: 'Invoice is already fully paid' });

    const reminder = await Reminder.create({
      business: req.user.business._id,
      invoice: invoice._id,
      customer: invoice.customer?._id,
      customerName: invoice.customerName,
      customerEmail: invoice.customer?.email,
      customerPhone: whatsappNumber || invoice.customer?.phone,
      amount: invoice.dueAmount,
      dueDate: invoice.dueDate,
      channel,
    });

    if (channel === 'email') {
      const email = invoice.customer?.email;
      if (!email) return res.status(400).json({ message: 'Customer has no email address' });
      await transporter.sendMail({
        from: `"${invoice.business?.name || 'Vyapari'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Payment Reminder — Invoice ${invoice.invoiceNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
            <h2 style="color:#16a34a;margin-bottom:4px">${invoice.business?.name || 'Vyapari'}</h2>
            <p style="color:#6b7280;font-size:13px;margin-top:0">Payment Reminder</p>
            <hr style="border-color:#e5e7eb"/>
            <p>Dear <strong>${invoice.customerName}</strong>,</p>
            <p>This is a friendly reminder that the following invoice is pending payment:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
              <tr><td style="padding:6px 0;color:#6b7280">Invoice No</td><td style="font-weight:600">${invoice.invoiceNumber}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Amount Due</td><td style="font-weight:600;color:#dc2626">₹${invoice.dueAmount.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Due Date</td><td style="font-weight:600">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}</td></tr>
            </table>
            <p>Please make the payment at your earliest convenience.</p>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">Thank you for your business!<br/><strong>${invoice.business?.name}</strong></p>
          </div>`,
      });
      reminder.status = 'sent';
      reminder.sentAt = new Date();
      await reminder.save();
    }

    if (channel === 'whatsapp') {
      const phone = (whatsappNumber || invoice.customer?.phone || '').replace(/\D/g, '');
      if (!phone) return res.status(400).json({ message: 'No WhatsApp number provided' });
      // Return the WhatsApp URL for the frontend to open
      const msg = encodeURIComponent(
        `Dear ${invoice.customerName},\n\nThis is a payment reminder for invoice *${invoice.invoiceNumber}*.\n\nAmount Due: *₹${invoice.dueAmount.toFixed(2)}*\nDue Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}\n\nPlease make the payment at your earliest convenience.\n\nThank you!\n— ${invoice.business?.name}`
      );
      reminder.status = 'sent';
      reminder.sentAt = new Date();
      await reminder.save();
      return res.json({ message: 'WhatsApp reminder ready', reminder, whatsappUrl: `https://wa.me/${phone}?text=${msg}` });
    }

    res.json({ message: 'Reminder sent', reminder });
  } catch (err) { next(err); }
};
