import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/services';
import { Spinner } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { shareOnWhatsApp } from '../utils/invoiceUtils';
import { MdPrint, MdDownload, MdWhatsapp, MdArrowBack } from 'react-icons/md';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  paid:      { bg: '#16a34a', text: '#fff' },
  partial:   { bg: '#d97706', text: '#fff' },
  overdue:   { bg: '#dc2626', text: '#fff' },
  sent:      { bg: '#2563eb', text: '#fff' },
  draft:     { bg: '#6b7280', text: '#fff' },
  cancelled: { bg: '#6b7280', text: '#fff' },
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
    // Open the server-rendered HTML invoice in a new tab — same format as WhatsApp link
    // User can Print → Save as PDF from there
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.open(`${base}/public/invoices/${id}/pdf`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    shareOnWhatsApp(invoice);
  };

  if (loading) return <Spinner />;
  if (!invoice) return <p className="text-center p-8 text-gray-500">Invoice not found</p>;

  const b = invoice.business || {};
  const statusStyle = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft;

  const gstBreakup = invoice.items.reduce((acc, item) => {
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

  return (
    <div>
      {/* Action bar */}
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

      {/* Invoice */}
      <div id="invoice-print" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', margin: '0 auto', background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden' }}>

        {/* Top accent */}
        <div style={{ height: '6px', background: '#16a34a' }} />

        <div style={{ padding: '28px 36px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            {/* Left: business */}
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', letterSpacing: '-0.3px' }}>{b.name || 'Business Name'}</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
                {b.address && <div>{[b.address.line1, b.address.city, b.address.state, b.address.pincode].filter(Boolean).join(', ')}</div>}
                {b.phone && <div>Phone: {b.phone}</div>}
                {b.email && <div>Email: {b.email}</div>}
                {b.gstin && <div style={{ fontWeight: '600', color: '#374151' }}>GSTIN: {b.gstin}</div>}
              </div>
            </div>

            {/* Right: badge + meta */}
            <div style={{ textAlign: 'right', minWidth: '180px' }}>
              <div style={{ display: 'inline-block', background: '#16a34a', color: '#fff', padding: '5px 18px', borderRadius: '5px', fontWeight: '700', fontSize: '14px', letterSpacing: '0.5px' }}>
                TAX INVOICE
              </div>
              <div style={{ marginTop: '6px', display: 'inline-block', background: statusStyle.bg, color: statusStyle.text, padding: '2px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px' }}>
                {(invoice.status || '').toUpperCase()}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', lineHeight: '1.8' }}>
                <div><span style={{ color: '#9ca3af' }}>Invoice No: </span><strong style={{ color: '#111' }}>{invoice.invoiceNumber}</strong></div>
                <div><span style={{ color: '#9ca3af' }}>Date: </span><strong style={{ color: '#111' }}>{formatDate(invoice.invoiceDate)}</strong></div>
                {invoice.dueDate && <div><span style={{ color: '#9ca3af' }}>Due Date: </span><strong style={{ color: '#dc2626' }}>{formatDate(invoice.dueDate)}</strong></div>}
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 16px' }} />

          {/* ── Bill To ── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ background: '#f9fafb', padding: '4px 10px', display: 'inline-block', borderRadius: '3px', fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Bill To
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#111', marginBottom: '4px' }}>{invoice.customerName || 'N/A'}</div>
            {invoice.customerGstin && <div style={{ fontSize: '12px', color: '#555' }}>GSTIN: {invoice.customerGstin}</div>}
            {invoice.customerAddress && <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{invoice.customerAddress}</div>}
          </div>

          {/* ── Items Table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#1f2937' }}>
                {['#', 'Item', 'HSN', 'Qty', 'Rate', 'Disc%', 'GST%', 'Amount'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 8px', fontWeight: '600', color: '#fff', textAlign: i >= 3 ? 'right' : 'left', fontSize: '11px', letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 8px', color: '#9ca3af', width: '24px' }}>{i + 1}</td>
                  <td style={{ padding: '10px 8px', fontWeight: '600', color: '#111' }}>{item.name}</td>
                  <td style={{ padding: '10px 8px', color: '#9ca3af' }}>{item.hsnCode || '-'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(item.rate)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.discount || 0}%</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: '#374151' }}>{item.gstRate}%</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#111' }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── GST Breakup + Totals ── */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', alignItems: 'flex-start' }}>

            {/* GST Breakup */}
            {Object.keys(gstBreakup).length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>GST Breakup</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
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
                    {Object.entries(gstBreakup).map(([rate, vals], i) => (
                      <tr key={rate} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '7px 8px', color: '#374151' }}>{rate}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(vals.taxable)}</td>
                        {!invoice.isInterState ? (
                          <>
                            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(vals.cgst)}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(vals.sgst)}</td>
                          </>
                        ) : (
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: '#374151' }}>{formatCurrency(vals.igst)}</td>
                        )}
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700', color: '#111' }}>{formatCurrency(vals.cgst + vals.sgst + vals.igst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div style={{ minWidth: '230px' }}>
              {totalsRows.map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#9ca3af' }}>{label}</span>
                  <span style={{ color, fontWeight: '500' }}>{value}</span>
                </div>
              ))}
              {/* Grand Total */}
              <div style={{ background: '#1f2937', borderRadius: '6px', padding: '10px 12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>Grand Total</span>
                <span style={{ color: '#4ade80', fontWeight: '800', fontSize: '16px' }}>{formatCurrency(invoice.grandTotal)}</span>
              </div>
              {/* Paid */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '7px 12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '12px' }}>Paid</span>
                <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '12px' }}>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              {/* Balance Due */}
              <div style={{ background: invoice.dueAmount > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${invoice.dueAmount > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: '6px', padding: '7px 12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: invoice.dueAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: '700', fontSize: '13px' }}>Balance Due</span>
                <span style={{ color: invoice.dueAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: '800', fontSize: '13px' }}>{formatCurrency(invoice.dueAmount)}</span>
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          {invoice.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#78350f' }}>
              <strong style={{ color: '#92400e' }}>Notes: </strong>{invoice.notes}
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.8' }}>
              <div>Payment Mode: <strong style={{ color: '#374151', textTransform: 'uppercase' }}>{invoice.paymentMode}</strong></div>
              <div>This is a computer-generated invoice.</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '4px', marginTop: '36px', width: '150px' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>Authorised Signatory</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>{b.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ height: '6px', background: '#16a34a' }} />
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
