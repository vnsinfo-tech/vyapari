const Invoice = require('../models/Invoice');

// Marks invoices as overdue if dueDate has passed and they are still unpaid/partial
const markOverdueInvoices = async () => {
  try {
    const result = await Invoice.updateMany(
      {
        status: { $in: ['sent', 'partial'] },
        dueDate: { $lt: new Date() },
        isDeleted: false,
      },
      { $set: { status: 'overdue' } }
    );
    if (result.modifiedCount > 0)
      console.log(`[cron] Marked ${result.modifiedCount} invoice(s) as overdue`);
  } catch (err) {
    console.error('[cron] markOverdueInvoices error:', err.message);
  }
};

// Run immediately on startup, then every hour
const startCron = () => {
  markOverdueInvoices();
  setInterval(markOverdueInvoices, 60 * 60 * 1000);
};

module.exports = startCron;
