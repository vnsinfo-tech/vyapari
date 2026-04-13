import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/services';
import { Spinner } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { shareOnWhatsApp } from '../utils/invoiceUtils';
import { MdPrint, MdDownload, MdWhatsapp, MdArrowBack } from 'react-icons/md';

const STATUS_COLORS = {
  paid:      '#16a34a',
  partial:   '#d97706',
  overdue:   '#dc2626',
  sent:      '#2563eb',
  draft:     '#6b7280',
  cancelled: '#6b7280',
};

export default function PrintInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoiceAPI.get(id).then(r => setInvoice(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const a = document.createElement('a');
    a.href = `${base}/invoices/${id}/pdf?token=${token}`;
    a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleWhatsApp = () => invoice && shareOnWhatsApp(invoice);

  if (loading) return <Spinner />;
  if (!invoice) return <p className="text-center p-8 text-gray-500">Invoice not found</p>;

  const b = invoice.business || {};
  const statusBg = STATUS_COLORS[invoice.status] || '#6b7280';

  const gstBreakup = (invoice.items || []).reduce((acc, item) => {
    if (!item.gstRate) return acc;
    const key = `${item.gstRate}%`;
    if (!acc[key]) acc[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    const lineTotal = item.quantity * item.rate * (1 - (item.discount || 0) / 100);
    acc[key].taxable += lineTotal;
    acc[key].cgst += item.cgst || 0;
    acc[key].sgst += item.sgst || 0;
    acc[key].igst += item.igst || 0;
    return acc;
  }, {});

  const totalsRows = [
    { label: 'Subtotal', value: formatCurrency(invoice.subtotal), color: '#374151' },
    ...(invoice.totalDiscount > 0 ? [{ label: 'Discount', value: `-${formatCurrency(invoice.totalDiscount)}`, color: '#dc2626' }] : []),
    ...(!invoice.isInterState
      ? [{ label: 'CGST', value: formatCurrency(invoice.totalCgst), color: '#6b7280' },
         { label: 'SGST', value: formatCurrency(invoice.totalSgst), color: '#6b7280' }]
      : [{ label: 'IGST', value: formatCurrency(invoice.totalIgst), color: '#6b7280' }]),
    ...(invoice.shipping > 0 ? [{ label: 'Shipping', value: formatCurrency(invoice.shipping), color: '#6b7280' }] : []),
  ];

  const s = (obj) => obj; // passthrough for inline styles

  return (
    <div>
      {/* ── Action bar (hidden on print) ── */}
      <div className="print:hidden flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/invoices')} className="btn-secondary flex items-center gap-2 text-sm">
          <MdArrowBack size={16} /> Back
        </button>
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
          <MdPrint size={16} /> Print
        </button>
        <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2 text-sm">
          <MdDownload size={16} /> Download PDF
        </button>
        <button onClick={handleWhatsApp} className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <MdWhatsapp size={16} /> Share on WhatsApp
        </button>
      </div>

      {/* ── Invoice ── */}
      <div id="invoice-print" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ height: '8px', background: '#16a34a' }} />

        <div style={{ padding: '28px 40px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            {/* Business */}
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1f2937', letterSpacing: '-0.3px' }}>{b.name || 'Business Name'}</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', lineHeight: '1.7' }}>
                {b.address && <div>{[b.address.line1, b.address.city, b.address.state, b.address.pincode].filter(Boolean).join(', ')}</div>}
                {b.phone && <div>Phone: {b.phone}</div>}
                {b.email && <div>Email: {b.email}</div>}
                {b.gstin && <div style={{ fontWeight: '700', color: '#374151' }}>GSTIN: {b.gstin}</div>}
              </div>
            </div>

            {/* Invoice meta */}
            <div style={{ textAlign: 'right', minWidth: '190px' }}>
              <div style={{ display: 'inline-block', background: '#16a34a', color: '#fff', padding: '6px 20px', borderRadius: '5px', fontWeight: '700', fontSize: '13px', letterSpacing: '0.5px' }}>
                TAX INVOICE
              </div>
              <div style={{ marginTop: '6px', display: 'inline-block', background: statusBg, color: '#fff', padding: '2px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px' }}>
                {(invoice.status || '').toUpperCase()}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', lineHeight: '1.9' }}>
                <div><span style={{ color: '#9ca3af' }}>Invoice No: </span><strong style={{ color: '#1f2937' }}>{invoice.invoiceNumber}</strong></div>
                <div><span style={{ color: '#9ca3af' }}>Date: </span><strong style={{ color: '#1f2937' }}>{formatDate(invoice.invoiceDate)}</strong></div>
                {invoice.dueDate && <div><span style={{ color: '#9ca3af' }}>Due Date: </span><strong style={{ color: '#dc2626' }}>{formatDate(invoice.dueDate)}</strong></div>}
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 18px' }} />

          {/* Bill To */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ background: '#f3f4f6', padding: '3px 10px', display: 'inline-block', borderRadius: '3px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Bill To
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>{invoice.customerName || 'N/A'}</div>
            {invoice.customerGstin && <div style={{ fontSize: '12px', color: '#555' }}>GSTIN: {invoice.customerGstin}</div>}
            {invoice.customerAddress && <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{invoice.customerAddress}</div>}
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '22px' }}>
            <thead>
              <tr style={{ background: '#1f2937' }}>
                {['#', 'Item', 'HSN', 'Qty', 'Rate', 'Disc%', 'GST%', 'Amount'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 8px', fontWeight: '600', color: '#fff', textAlign: i >= 3 ? 'right' : 'left', fontSize: '11px', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 8px', color: '#9ca3af', width: '24px' }}>{i + 1}</td>
                  <td style={{ padding: '10px 8px', fontWeight: '600', color: '#1f2937' }}>{item.name}</td>
                  <td style={{ padding: '10px 8px', color: '#9ca3af' }}>{item.hsnCode || '-'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(item.rate)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.discount || 0}%</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.gstRate}%</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#1f2937' }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* GST Breakup + Totals */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '22px', alignItems: 'flex-start' }}>

            {/* GST Breakup */}
            {Object.keys(gstBreakup).length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>GST Breakup</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e5e7eb' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ padding: '7px 8px', textAlign: 'left', color: '#374151', fontWeight: '600' }}>Rate</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>Taxable</th>
                      {!invoice.isInterState ? (
                        <>
                          <th style={{ padding: '7px 8px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>CGST</th>
                          <th style={{ padding: '7px 8px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>SGST</th>
                        </>
                      ) : (
                        <th style={{ padding: '7px 8px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>IGST</th>
                      )}
                      <th style={{ padding: '7px 8px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(gstBreakup).map(([rate, v], i) => (
                      <tr key={rate} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '7px 8px', color: '#374151' }}>{rate}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(v.taxable)}</td>
                        {!invoice.isInterState ? (
                          <>
                            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(v.cgst)}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(v.sgst)}</td>
                          </>
                        ) : (
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(v.igst)}</td>
                        )}
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700', color: '#1f2937' }}>{formatCurrency(v.cgst + v.sgst + v.igst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div style={{ minWidth: '240px' }}>
              {totalsRows.map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#9ca3af' }}>{label}</span>
                  <span style={{ color, fontWeight: '500' }}>{value}</span>
                </div>
              ))}
              {/* Grand Total */}
              <div style={{ background: '#1f2937', borderRadius: '6px', padding: '10px 14px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>Grand Total</span>
                <span style={{ color: '#4ade80', fontWeight: '800', fontSize: '16px' }}>{formatCurrency(invoice.grandTotal)}</span>
              </div>
              {/* Paid */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '7px 14px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '12px' }}>Paid</span>
                <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '12px' }}>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              {/* Balance Due */}
              <div style={{ background: invoice.dueAmount > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${invoice.dueAmount > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: '6px', padding: '8px 14px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: invoice.dueAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: '700', fontSize: '13px' }}>Balance Due</span>
                <span style={{ color: invoice.dueAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: '800', fontSize: '14px' }}>{formatCurrency(invoice.dueAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '22px', fontSize: '12px', color: '#78350f' }}>
              <strong style={{ color: '#92400e' }}>Notes: </strong>{invoice.notes}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.9' }}>
              <div>Payment Mode: <strong style={{ color: '#374151', textTransform: 'uppercase' }}>{invoice.paymentMode}</strong></div>
              <div>This is a computer-generated invoice.</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '4px', marginTop: '40px', width: '160px' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>Authorised Signatory</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>{b.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ height: '8px', background: '#16a34a' }} />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print {
            position: fixed; left: 0; top: 0;
            width: 210mm; margin: 0;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}
