const PDFDocument = require('pdfkit');

/**
 * Single source of truth for PDF generation.
 * Used by both the authenticated download endpoint and the public WhatsApp link.
 */
function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const b = invoice.business || {};
      const W = 595.28, H = 841.89;
      const PAD = 40;
      const CW = W - PAD * 2; // 515.28

      // ── Colours ──
      const GREEN  = '#16a34a';
      const DARK   = '#1f2937';
      const GRAY   = '#6b7280';
      const LGRAY  = '#9ca3af';
      const WHITE  = '#ffffff';
      const BGALT  = '#f9fafb';
      const BGHEAD = '#f3f4f6';
      const STATUS_BG = { paid:'#16a34a', partial:'#d97706', overdue:'#dc2626', sent:'#2563eb', draft:'#6b7280', cancelled:'#6b7280' };

      const fmt = n => `Rs.${(n||0).toFixed(2)}`;
      const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-';

      // ── Top bar ──
      doc.rect(0, 0, W, 8).fill(GREEN);

      // ── Business (left) ──
      let y = 22;
      doc.fontSize(20).fillColor(DARK).font('Helvetica-Bold').text(b.name||'Business', PAD, y, {width:300});
      y += 28;
      doc.fontSize(9).fillColor(GRAY).font('Helvetica');
      if (b.address) {
        const a = [b.address.line1,b.address.city,b.address.state,b.address.pincode].filter(Boolean).join(', ');
        if (a) { doc.text(a, PAD, y, {width:300}); y += 13; }
      }
      if (b.phone) { doc.text(`Phone: ${b.phone}`, PAD, y, {width:300}); y += 13; }
      if (b.email) { doc.text(`Email: ${b.email}`, PAD, y, {width:300}); y += 13; }
      if (b.gstin) { doc.fillColor(DARK).font('Helvetica-Bold').text(`GSTIN: ${b.gstin}`, PAD, y, {width:300}); y += 13; }

      // ── Invoice meta (right) ──
      const RX = W - PAD - 170;
      // TAX INVOICE badge
      doc.rect(RX, 22, 170, 24).fill(GREEN);
      doc.fontSize(12).fillColor(WHITE).font('Helvetica-Bold').text('TAX INVOICE', RX, 28, {width:170, align:'center'});
      // Status badge
      const sBg = STATUS_BG[invoice.status] || '#6b7280';
      doc.rect(RX+35, 52, 100, 16).fill(sBg);
      doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold').text((invoice.status||'').toUpperCase(), RX+35, 56, {width:100, align:'center'});
      // Meta lines
      let my = 76;
      doc.fontSize(9).fillColor(LGRAY).font('Helvetica');
      doc.text('Invoice No: ', RX, my, {continued:true}).fillColor(DARK).font('Helvetica-Bold').text(invoice.invoiceNumber||'-');
      my += 14;
      doc.fillColor(LGRAY).font('Helvetica').text('Date: ', RX, my, {continued:true}).fillColor(DARK).font('Helvetica-Bold').text(fmtD(invoice.invoiceDate));
      my += 14;
      if (invoice.dueDate) {
        doc.fillColor(LGRAY).font('Helvetica').text('Due Date: ', RX, my, {continued:true}).fillColor('#dc2626').font('Helvetica-Bold').text(fmtD(invoice.dueDate));
        my += 14;
      }

      // ── Divider ──
      y = Math.max(y, my) + 12;
      doc.moveTo(PAD, y).lineTo(W-PAD, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 14;

      // ── Bill To ──
      doc.rect(PAD, y, 80, 14).fill(BGHEAD);
      doc.fontSize(8).fillColor(LGRAY).font('Helvetica-Bold').text('BILL TO', PAD+4, y+3);
      y += 18;
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(invoice.customerName||'N/A', PAD, y, {width:320});
      y += 18;
      if (invoice.customerGstin) { doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(`GSTIN: ${invoice.customerGstin}`, PAD, y); y += 13; }
      if (invoice.customerAddress) { doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(invoice.customerAddress, PAD, y, {width:320}); y += 13; }
      y += 12;

      // ── Items Table ──
      const COL = { no:PAD, name:PAD+20, hsn:PAD+185, qty:PAD+255, rate:PAD+315, disc:PAD+375, gst:PAD+415, amt:PAD+455 };
      const RH = 20, HH = 24;

      // Header
      doc.rect(PAD, y, CW, HH).fill(DARK);
      doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold');
      doc.text('#',      COL.no,   y+8, {width:18});
      doc.text('Item',   COL.name, y+8, {width:160});
      doc.text('HSN',    COL.hsn,  y+8, {width:64});
      doc.text('Qty',    COL.qty,  y+8, {width:56, align:'right'});
      doc.text('Rate',   COL.rate, y+8, {width:56, align:'right'});
      doc.text('Disc%',  COL.disc, y+8, {width:36, align:'right'});
      doc.text('GST%',   COL.gst,  y+8, {width:36, align:'right'});
      doc.text('Amount', COL.amt,  y+8, {width:60, align:'right'});
      y += HH;

      // Rows
      (invoice.items||[]).forEach((item, i) => {
        doc.rect(PAD, y, CW, RH).fill(i%2===0 ? WHITE : BGALT);
        doc.fontSize(8).fillColor(DARK).font('Helvetica');
        doc.text(String(i+1), COL.no, y+6, {width:18});
        doc.font('Helvetica-Bold').text(item.name||'', COL.name, y+6, {width:160, ellipsis:true});
        doc.font('Helvetica').fillColor(LGRAY).text(item.hsnCode||'-', COL.hsn, y+6, {width:64});
        doc.fillColor(DARK).text(`${item.quantity||0} ${item.unit||''}`, COL.qty, y+6, {width:56, align:'right'});
        doc.text(fmt(item.rate), COL.rate, y+6, {width:56, align:'right'});
        doc.text(`${item.discount||0}%`, COL.disc, y+6, {width:36, align:'right'});
        doc.text(`${item.gstRate||0}%`, COL.gst, y+6, {width:36, align:'right'});
        doc.font('Helvetica-Bold').text(fmt(item.amount), COL.amt, y+6, {width:60, align:'right'});
        y += RH;
      });
      y += 18;

      // ── GST Breakup ──
      const gstMap = (invoice.items||[]).reduce((acc, item) => {
        if (!item.gstRate) return acc;
        const k = `${item.gstRate}%`;
        if (!acc[k]) acc[k] = {taxable:0, cgst:0, sgst:0, igst:0};
        acc[k].taxable += item.quantity * item.rate * (1-(item.discount||0)/100);
        acc[k].cgst += item.cgst||0; acc[k].sgst += item.sgst||0; acc[k].igst += item.igst||0;
        return acc;
      }, {});
      const hasGST = Object.keys(gstMap).length > 0;

      // Totals column
      const TX = W - PAD - 195;
      const TW = 195;

      if (hasGST) {
        const GW = TX - PAD - 12;
        doc.fontSize(8).fillColor(LGRAY).font('Helvetica-Bold').text('GST BREAKUP', PAD, y);
        let gy = y + 12;
        const gCols = invoice.isInterState ? ['Rate','Taxable','IGST','Total'] : ['Rate','Taxable','CGST','SGST','Total'];
        const gcw = GW / gCols.length;
        doc.rect(PAD, gy, GW, 18).fill(BGHEAD);
        doc.fontSize(8).fillColor(DARK).font('Helvetica-Bold');
        gCols.forEach((h,i) => doc.text(h, PAD+i*gcw, gy+5, {width:gcw, align:i===0?'left':'right'}));
        gy += 18;
        Object.entries(gstMap).forEach(([rate, v], i) => {
          doc.rect(PAD, gy, GW, 16).fill(i%2===0?WHITE:BGALT);
          doc.fontSize(8).fillColor(DARK).font('Helvetica');
          const vals = invoice.isInterState
            ? [rate, fmt(v.taxable), fmt(v.igst), fmt(v.cgst+v.sgst+v.igst)]
            : [rate, fmt(v.taxable), fmt(v.cgst), fmt(v.sgst), fmt(v.cgst+v.sgst+v.igst)];
          vals.forEach((val,j) => doc.text(val, PAD+j*gcw, gy+4, {width:gcw, align:j===0?'left':'right'}));
          gy += 16;
        });
      }

      // Totals rows
      const totals = [
        {label:'Subtotal', value:fmt(invoice.subtotal), color:DARK},
        ...(invoice.totalDiscount>0?[{label:'Discount',value:`-${fmt(invoice.totalDiscount)}`,color:'#dc2626'}]:[]),
        ...(!invoice.isInterState
          ?[{label:'CGST',value:fmt(invoice.totalCgst),color:GRAY},{label:'SGST',value:fmt(invoice.totalSgst),color:GRAY}]
          :[{label:'IGST',value:fmt(invoice.totalIgst),color:GRAY}]),
        ...(invoice.shipping>0?[{label:'Shipping',value:fmt(invoice.shipping),color:GRAY}]:[]),
      ];
      let ty = y;
      totals.forEach(({label,value,color}) => {
        doc.fontSize(9).fillColor(LGRAY).font('Helvetica').text(label, TX, ty, {width:110});
        doc.fillColor(color).text(value, TX+110, ty, {width:80, align:'right'});
        ty += 14;
      });
      // Grand Total
      doc.rect(TX-4, ty, TW, 26).fill(DARK);
      doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold').text('Grand Total', TX, ty+8, {width:110});
      doc.fillColor('#4ade80').text(fmt(invoice.grandTotal), TX+110, ty+8, {width:80, align:'right'});
      ty += 32;
      // Paid
      doc.rect(TX-4, ty, TW, 20).fill('#f0fdf4');
      doc.fontSize(9).fillColor(GREEN).font('Helvetica-Bold').text('Paid', TX, ty+6, {width:110});
      doc.text(fmt(invoice.paidAmount), TX+110, ty+6, {width:80, align:'right'});
      ty += 26;
      // Balance Due
      const isDue = (invoice.dueAmount||0) > 0;
      doc.rect(TX-4, ty, TW, 20).fill(isDue?'#fef2f2':'#f0fdf4');
      doc.fontSize(10).fillColor(isDue?'#dc2626':GREEN).font('Helvetica-Bold').text('Balance Due', TX, ty+5, {width:110});
      doc.text(fmt(invoice.dueAmount), TX+110, ty+5, {width:80, align:'right'});
      ty += 28;

      y = Math.max(ty, y) + 12;

      // ── Notes ──
      if (invoice.notes) {
        doc.rect(PAD, y, CW, 28).fill('#fffbeb');
        doc.fontSize(9).fillColor('#92400e').font('Helvetica-Bold').text('Notes: ', PAD+6, y+9, {continued:true});
        doc.font('Helvetica').fillColor('#78350f').text(invoice.notes, {width:CW-60});
        y += 36;
      }

      // ── Footer ──
      y += 10;
      doc.moveTo(PAD, y).lineTo(W-PAD, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 12;
      doc.fontSize(9).fillColor(LGRAY).font('Helvetica')
        .text('Payment Mode: ', PAD, y, {continued:true})
        .font('Helvetica-Bold').fillColor(DARK).text((invoice.paymentMode||'cash').toUpperCase());
      doc.fontSize(8).fillColor(LGRAY).font('Helvetica').text('This is a computer-generated invoice.', PAD, y+14);

      // Signatory
      const SX = W - PAD - 160;
      doc.moveTo(SX, y+52).lineTo(W-PAD, y+52).strokeColor(LGRAY).lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor(LGRAY).font('Helvetica').text('Authorised Signatory', SX, y+56, {width:160, align:'center'});
      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(b.name||'', SX, y+68, {width:160, align:'center'});

      // ── Bottom bar ──
      doc.rect(0, H-8, W, 8).fill(GREEN);

      doc.end();
    } catch(err) { reject(err); }
  });
}

module.exports = generateInvoicePDF;
