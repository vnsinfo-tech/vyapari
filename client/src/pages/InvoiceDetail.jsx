import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceAPI, paymentAPI } from '../api/services';
import { Spinner, Badge, Modal } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { shareOnWhatsApp } from '../utils/invoiceUtils';
import { MdArrowBack, MdEdit, MdPrint, MdWhatsapp, MdPayment, MdDownload } from 'react-icons/md';
import toast from 'react-hot-toast';
import { PAYMENT_MODES } from '../constants';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchInvoice = () => {
    invoiceAPI.get(id).then(r => {
      setInvoice(r.data);
      setPayForm(f => ({ ...f, amount: r.data.dueAmount }));
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoice();
    paymentAPI.list().then(r => {
      setPayments((r.data || []).filter(p => p.invoice === id || p.invoice?._id === id));
    }).catch(() => {});
  }, [id]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await paymentAPI.create({
        type: 'received',
        partyModel: 'Customer',
        partyName: invoice.customerName,
        invoice: id,
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        reference: payForm.reference,
        notes: payForm.notes,
        date: new Date(),
      });
      toast.success('Payment recorded');
      setPayModal(false);
      fetchInvoice();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleWhatsApp = () => shareOnWhatsApp(invoice);

  const handleDownloadPDF = async () => {
    navigate(`/invoices/${id}/print`);
  };

  if (loading) return <Spinner />;
  if (!invoice) return <p className="text-center p-8 text-gray-500">Invoice not found</p>;

  const b = invoice.business || {};

  return (
    <div className="max-w-4xl space-y-5">
      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/invoices')} className="btn-secondary flex items-center gap-2 text-sm">
          <MdArrowBack size={16} /> Back
        </button>
        <button onClick={() => navigate(`/invoices/${id}/edit`)} className="btn-secondary flex items-center gap-2 text-sm">
          <MdEdit size={16} /> Edit
        </button>
        <button onClick={() => navigate(`/invoices/${id}/print`)} className="btn-secondary flex items-center gap-2 text-sm">
          <MdPrint size={16} /> Print / PDF
        </button>
        <button onClick={handleWhatsApp} className="flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <MdWhatsapp size={16} /> WhatsApp
        </button>
        {invoice.dueAmount > 0 && (
          <button onClick={() => setPayModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <MdPayment size={16} /> Record Payment
          </button>
        )}
      </div>

      {/* Invoice header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">{b.name}</p>
            {b.gstin && <p className="text-xs text-gray-400">GSTIN: {b.gstin}</p>}
          </div>
          <div className="text-right">
            <Badge status={invoice.status} />
            <p className="text-sm text-gray-500 mt-2">Date: {formatDate(invoice.invoiceDate)}</p>
            {invoice.dueDate && <p className="text-sm text-gray-500">Due: {formatDate(invoice.dueDate)}</p>}
            <p className="text-xs text-gray-400 uppercase mt-1">{invoice.paymentMode}</p>
          </div>
        </div>

        <hr className="my-4 border-gray-100 dark:border-gray-700" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900 dark:text-white">{invoice.customerName}</p>
            {invoice.customerGstin && <p className="text-gray-500">GSTIN: {invoice.customerGstin}</p>}
            {invoice.customerAddress && <p className="text-gray-500">{invoice.customerAddress}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Amount Summary</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.grandTotal)}</p>
            <p className="text-sm text-green-600">Paid: {formatCurrency(invoice.paidAmount)}</p>
            <p className={`text-sm font-semibold ${invoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {invoice.dueAmount > 0 ? `Due: ${formatCurrency(invoice.dueAmount)}` : 'Fully Paid ✓'}
            </p>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['#', 'Item', 'HSN', 'Qty', 'Rate', 'Disc%', 'GST%', 'Amount'].map((h, i) => (
                  <th key={h} className={`py-2 px-3 text-xs font-semibold text-gray-500 uppercase ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="py-2 px-3 text-gray-500">{item.hsnCode || '-'}</td>
                  <td className="py-2 px-3 text-right">{item.quantity} {item.unit}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(item.rate)}</td>
                  <td className="py-2 px-3 text-right">{item.discount || 0}%</td>
                  <td className="py-2 px-3 text-right">{item.gstRate}%</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
            {invoice.totalDiscount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{formatCurrency(invoice.totalDiscount)}</span></div>}
            {!invoice.isInterState ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(invoice.totalCgst)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(invoice.totalSgst)}</span></div>
              </>
            ) : <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(invoice.totalIgst)}</span></div>}
            {invoice.shipping > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatCurrency(invoice.shipping)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Grand Total</span><span className="text-primary-600">{formatCurrency(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment History</h2>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-500">{formatDate(p.date)} · {p.paymentMode?.toUpperCase()}</p>
                  {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                </div>
                <span className="badge-green">Received</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <form onSubmit={handleRecordPayment} className="space-y-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" className="input text-lg font-semibold"
              value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
            <p className="text-xs text-gray-400 mt-1">Total due: {formatCurrency(invoice.dueAmount)}</p>
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={payForm.paymentMode} onChange={e => setPayForm(f => ({ ...f, paymentMode: e.target.value }))}>
              {PAYMENT_MODES.slice(0, 4).map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference / Transaction ID</label>
            <input className="input" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="UPI ref, cheque no..." />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
