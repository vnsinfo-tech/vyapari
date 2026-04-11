import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supplierAPI, purchaseAPI, paymentAPI } from '../api/services';
import { Spinner, Badge, Modal } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { MdArrowBack, MdPhone, MdEmail, MdLocationOn, MdPayment } from 'react-icons/md';
import toast from 'react-hot-toast';
import { PAYMENT_MODES } from '../constants';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [supRes, purRes] = await Promise.all([
        supplierAPI.get(id),
        purchaseAPI.list({ supplier: id, limit: 50 }),
      ]);
      setSupplier(supRes.data);
      const purs = purRes.data.data || [];
      setPurchases(purs);
      setOutstanding(purs.reduce((sum, p) => sum + (p.dueAmount || 0), 0));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const openPayModal = (pur) => {
    setPayForm({ amount: pur.dueAmount, paymentMode: 'cash', reference: '', notes: '' });
    setPayModal(pur);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await paymentAPI.create({
        type: 'paid',
        party: id,
        partyModel: 'Supplier',
        partyName: supplier.name,
        purchase: payModal._id,
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        reference: payForm.reference,
        notes: payForm.notes,
        date: new Date(),
      });
      toast.success('Payment recorded');
      setPayModal(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (!supplier) return <p className="text-center p-8 text-gray-500">Supplier not found</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/suppliers')} className="btn-secondary flex items-center gap-2 text-sm">
          <MdArrowBack size={16} /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{supplier.name}</h1>
          <p className="text-sm text-gray-500">Supplier Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {supplier.phone && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MdPhone size={16} className="text-primary-600" />{supplier.phone}</div>}
            {supplier.email && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MdEmail size={16} className="text-primary-600" />{supplier.email}</div>}
            {supplier.address?.city && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 col-span-2"><MdLocationOn size={16} className="text-primary-600" />{[supplier.address.line1, supplier.address.city, supplier.address.state].filter(Boolean).join(', ')}</div>}
            {supplier.gstin && <div className="text-gray-600 dark:text-gray-400 col-span-2"><span className="font-medium">GSTIN:</span> {supplier.gstin}</div>}
          </div>
        </div>

        <div className="card flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Amount Payable</p>
          <p className={`text-3xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(outstanding)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{outstanding > 0 ? 'Pending payment' : 'All clear ✓'}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Purchase History</h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No purchases yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Bill #', 'Date', 'Total', 'Paid', 'Due', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-2 font-medium text-primary-600">{p.billNumber || '-'}</td>
                    <td className="py-2 px-2 text-gray-500">{formatDate(p.purchaseDate)}</td>
                    <td className="py-2 px-2 font-medium">{formatCurrency(p.grandTotal)}</td>
                    <td className="py-2 px-2 text-green-600">{formatCurrency(p.paidAmount)}</td>
                    <td className="py-2 px-2 text-red-500 font-medium">{formatCurrency(p.dueAmount)}</td>
                    <td className="py-2 px-2"><Badge status={p.status} /></td>
                    <td className="py-2 px-2">
                      {p.dueAmount > 0 && (
                        <button onClick={() => openPayModal(p)} className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1">
                          <MdPayment size={13} /> Pay
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

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.billNumber || 'Purchase'}`} size="sm">
        <form onSubmit={handleRecordPayment} className="space-y-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" className="input text-lg font-semibold"
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
            <label className="label">Reference</label>
            <input className="input" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="Cheque no, transfer ref..." />
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
