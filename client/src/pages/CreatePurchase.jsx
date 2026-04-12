import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseAPI, supplierAPI, productAPI } from '../api/services';
import { GST_RATES, PAYMENT_MODES } from '../constants';
import { formatCurrency } from '../utils';
import { MdAdd, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';

const emptyItem = { name: '', quantity: '', rate: '', gstRate: 18, unit: 'pcs', product: '' };

export default function CreatePurchase() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplierName: '', supplier: '', billNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    dueDate: '', paymentMode: 'cash', paidAmount: '', notes: '',
  });
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    supplierAPI.list({ limit: 100 }).then(r => setSuppliers(r.data.data));
    productAPI.list({ limit: 100 }).then(r => setProducts(r.data.data));
    if (isEdit) {
      purchaseAPI.get(id).then(r => {
        const p = r.data;
        setForm({ supplierName: p.supplierName || '', supplier: p.supplier?._id || '', billNumber: p.billNumber || '', purchaseDate: p.purchaseDate?.split('T')[0], dueDate: p.dueDate?.split('T')[0] || '', paymentMode: p.paymentMode, paidAmount: String(p.paidAmount ?? ''), notes: p.notes || '' });
        setItems(p.items.map(i => ({ name: i.name, quantity: String(i.quantity), rate: String(i.rate), gstRate: i.gstRate, unit: i.unit || 'pcs', product: i.product || '' })));
      });
    }
  }, [id]);

  const calcItem = (item) => {
    const base = parseInt(item.quantity || 0) * Number(item.rate);
    const tax = (base * item.gstRate) / 100;
    return { base, tax, total: base + tax };
  };

  const totals = items.reduce((acc, item) => {
    const { base, tax, total } = calcItem(item);
    return { subtotal: acc.subtotal + base, tax: acc.tax + tax, total: acc.total + total };
  }, { subtotal: 0, tax: 0, total: 0 });

  const grandTotal = totals.total;
  const dueAmount = grandTotal - (Number(form.paidAmount) || 0);

  const setItem = (i, field, value) => {
    const updated = [...items];
    if (field === 'quantity') value = value.replace(/[^0-9]/g, '');
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'product') {
      const p = products.find(p => p._id === value);
      if (p) updated[i] = { ...updated[i], name: p.name, rate: p.purchasePrice || p.salePrice, gstRate: p.gstRate, unit: p.unit };
    }
    setItems(updated);
  };

  const handleSupplier = (supplierId) => {
    const s = suppliers.find(s => s._id === supplierId);
    if (s) setForm(f => ({ ...f, supplier: supplierId, supplierName: s.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.some(i => !i.name || Number(i.quantity) <= 0 || Number(i.rate) <= 0)) return toast.error('Fill all item details');
    setLoading(true);
    try {
      const payload = { ...form, items };
      if (isEdit) await purchaseAPI.update(id, payload);
      else await purchaseAPI.create(payload);
      toast.success(isEdit ? 'Purchase updated' : 'Purchase recorded');
      navigate('/purchases');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Purchase' : 'New Purchase'}</h1>
        <p className="text-sm text-gray-500">Record a supplier purchase — stock will be updated automatically</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Supplier & Purchase Details */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Select Supplier</label>
            <select className="input" value={form.supplier} onChange={e => handleSupplier(e.target.value)}>
              <option value="">-- Select or type below --</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Supplier Name *</label>
            <input className="input" value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Bill / Invoice Number</label>
            <input className="input" value={form.billNumber} onChange={e => setForm(f => ({ ...f, billNumber: e.target.value }))} placeholder="Supplier's bill no." />
          </div>
          <div>
            <label className="label">Purchase Date *</label>
            <input type="date" className="input" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Purchase Items</h2>
          <div className="-mx-5 overflow-x-auto">
            <div className="min-w-[600px] px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Product', 'Qty', 'Rate (₹)', 'GST %', 'Amount', ''].map(h => (
                    <th key={h} className="text-left py-2 px-1 text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const { total } = calcItem(item);
                  return (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-1 min-w-[160px]">
                        <select className="input text-xs mb-1" value={item.product} onChange={e => setItem(i, 'product', e.target.value)}>
                          <option value="">Custom item</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <input className="input text-xs" value={item.name} onChange={e => setItem(i, 'name', e.target.value)} placeholder="Item name" required />
                      </td>
                      <td className="py-2 px-1 w-16"><input type="text" inputMode="numeric" pattern="[0-9]*" className="input text-xs" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} /></td>
                      <td className="py-2 px-1 w-24"><input type="number" min="0" className="input text-xs" value={item.rate} onChange={e => setItem(i, 'rate', e.target.value)} /></td>
                      <td className="py-2 px-1 w-20">
                        <select className="input text-xs" value={item.gstRate} onChange={e => setItem(i, 'gstRate', +e.target.value)}>
                          {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-1 w-24 font-medium text-gray-900 dark:text-white">{formatCurrency(total)}</td>
                      <td className="py-2 px-1">
                        {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><MdDelete size={16} /></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          <button type="button" onClick={() => setItems([...items, { ...emptyItem }])} className="mt-3 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
            <MdAdd size={16} /> Add Item
          </button>
        </div>

        {/* Totals & Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card space-y-3">
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input type="number" min="0" className="input" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total GST</span><span>{formatCurrency(totals.tax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span>Grand Total</span><span className="text-primary-600">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{formatCurrency(form.paidAmount)}</span></div>
              <div className="flex justify-between text-red-500 font-semibold"><span>Due</span><span>{formatCurrency(dueAmount)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/purchases')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : isEdit ? 'Update Purchase' : 'Record Purchase'}</button>
        </div>
      </form>
    </div>
  );
}
