import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadPDF = async (invoice, setDownloading) => {
  setDownloading(true);
  try {
    // Navigate to print page and capture — handled by PrintInvoice directly.
    // This fallback is for InvoiceDetail's download button.
    window.open(`/invoices/${invoice._id}/print`, '_blank');
  } finally {
    setDownloading(false);
  }
};

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
  let y = 0;
  if (imgH <= pageH) {
    pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
  } else {
    // Multi-page support
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

export const shareOnWhatsApp = (invoice) => {
  const business = invoice.business || {};
  const customer = invoice.customerName;
  const total = invoice.grandTotal;
  const due = invoice.dueAmount;
  const number = invoice.invoiceNumber;

  // Use the frontend public invoice page URL — no login required
  const invoiceUrl = `${window.location.origin}/invoice/${invoice._id}`;

  const message = `Hi ${customer},

Invoice ${number} from ${business.name || 'Vyaparii'}

Grand Total: ₹${total}
Due Amount: ₹${due}

📄 View Invoice: ${invoiceUrl}

Please make the payment at your earliest convenience.

Thank you!
${business.name || 'Vyaparii'}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};
