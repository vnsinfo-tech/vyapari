import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Capture the rendered invoice element and save as PDF client-side
export const captureInvoicePDF = async (elementId, filename) => {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Invoice element not found');
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;
  if (imgH <= pageH) {
    pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
  } else {
    let y = 0;
    let remaining = imgH;
    while (remaining > 0) {
      pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
      remaining -= pageH;
      y += pageH;
      if (remaining > 0) pdf.addPage();
    }
  }
  pdf.save(filename);
};

// Share invoice on WhatsApp — links directly to PDF download (no login needed)
export const shareOnWhatsApp = (invoice) => {
  const business = invoice.business || {};
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const pdfUrl = `${base}/public/invoices/${invoice._id}/pdf`;
  const phone = invoice.customer?.phone ? invoice.customer.phone.replace(/\D/g, '') : '';
  const rs = (n) => `₹${(n || 0).toFixed(2)}`;

  const msg = encodeURIComponent(
    `Dear ${invoice.customerName},\n\n` +
    `Please find your invoice from *${business.name || 'Vyaparii'}*\n\n` +
    `Invoice No: *${invoice.invoiceNumber}*\n` +
    `Total Amount: *${rs(invoice.grandTotal)}*\n` +
    `Amount Due: *${rs(invoice.dueAmount)}*\n\n` +
    `📄 Download Invoice PDF: ${pdfUrl}\n\n` +
    `Thank you for your business!\n— ${business.name || 'Vyaparii'}`
  );

  const waUrl = phone
    ? `https://wa.me/${phone}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
  window.open(waUrl, '_blank');
};
