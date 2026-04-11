import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { customerAPI, paymentAPI } from '../api/services';
import { Spinner, Badge, Modal } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { MdArrowBack, MdAdd, MdPhone, MdEmail, MdLocationOn } from 'react-icons/md';
import toast from 'react-hot-toast';
import { PAYMENT_MODES } from '../constants';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null); // invoice to record payment for
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    customerAPI.get(id).then(r => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [id]);

  const openPayModal = (inv) => {
    setPayForm({ amount: inv.dueAmount, paymentMode: 'cash', reference: '', notes: '' });
    setPayModal(inv);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await paymentAPI.create({
        type: 'received',
        party: id,
        partyModel: 'Customer',
        partyName: data.customer.name,
        invoice: payModal._id,
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        reference: payForm.reference,
        notes: payForm.notes,
        date: new Date(),
      });
      toast.success('Payment recorded');
      setPayModal(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (!data) return <p className="text-center p-8 text-gray-500">Customer not found</p>;

  const { customer, invoices, outstanding } = data;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="btn-secondary flex items-center gap-2 text-sm">
          <MdArrowBack size={16} /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
          <p className="text-sm text-gray-500">Customer Profile</p>
        </div>
      </div>

      {/* Customer Info + Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MdPhone size={16} className="text-primary-600" /> {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MdEmail size={16} className="text-primary-600" /> {customer.email}
              </div>
            )}
            {customer.address?.city && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MdLocationOn size={16} className="text-primary-600" />
                {[customer.address.line1, customer.address.city, customer.address.state].filter(Boolean).join(', ')}
              </div>
            )}
            {customer.gstin && (
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">GSTIN:</span> {customer.gstin}
              </div>
            )}
          </div>
        </div>

        <div className="card flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outstanding Balance</p>
          <p className={`text-3xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(outstanding)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{outstanding > 0 ? 'Amount receivable' : 'All clear ✓'}</p>
          {outstanding > 0 && (
            <Link to="/reminders" className="mt-3 text-xs text-primary-600 hover:underline">Send Reminder →</Link>
          )}
        </div>
      </div>

      {/* Invoice History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice History</h2>
          <Link to={`/invoices/new`} className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3">
            <MdAdd size={14} /> New Invoice
          </Link>
        </div>

        {invoices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Invoice #', 'Date', 'Due Date', 'Total', 'Paid', 'Due', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-2 font-medium text-primary-600">
                      <Link to={`/invoices/${inv._id}/print`}>{inv.invoiceNumber}</Link>
                    </td>
                    <td className="py-2 px-2 text-gray-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-2 px-2 text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="py-2 px-2 font-medium">{formatCurrency(inv.grandTotal)}</td>
                    <td className="py-2 px-2 text-green-600">{formatCurrency(inv.paidAmount)}</td>
                    <td className="py-2 px-2 text-red-500 font-medium">{formatCurrency(inv.dueAmount)}</td>
                    <td className="py-2 px-2"><Badge status={inv.status} /></td>
                    <td className="py-2 px-2">
                      {inv.dueAmount > 0 && (
                        <button onClick={() => openPayModal(inv)} className="text-xs text-primary-600 hover:underline font-medium">
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.invoiceNumber}`} size="sm">
        <form onSubmit={handleRecordPayment} className="space-y-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" max={payModal?.dueAmount} className="input"
              value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
            <p className="text-xs text-gray-400 mt-1">Due: {formatCurrency(payModal?.dueAmount)}</p>
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
            <button type="button" onClick={() => setPayModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
