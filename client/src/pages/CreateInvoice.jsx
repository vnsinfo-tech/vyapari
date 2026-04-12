import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceAPI, customerAPI, productAPI } from '../api/services';
import { GST_RATES, PAYMENT_MODES } from '../constants';
import { formatCurrency } from '../utils';
import { MdAdd, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';

const emptyItem = { name: '', quantity: '', rate: '', discount: '', gstRate: 18, unit: 'pcs' };

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInterState, setIsInterState] = useState(false);

  const [form, setForm] = useState({
    customerName: '', customerGstin: '', customerAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '', paymentMode: 'cash', paidAmount: '', notes: '',
    shipping: '', customer: '', status: ''
  });
  const [items, setItems] = useState([{ ...emptyItem }]);

  const [originalItems, setOriginalItems] = useState([]);

  useEffect(() => {
    customerAPI.list({ limit: 100 }).then(r => setCustomers(r.data.data || []));
    productAPI.list({ limit: 100 }).then(r => setProducts(r.data.data || []));
    if (isEdit) {
      invoiceAPI.get(id).then(r => {
        const inv = r.data;
        setForm({ customerName: inv.customerName, customerGstin: inv.customerGstin || '', customerAddress: inv.customerAddress || '', invoiceDate: inv.invoiceDate?.split('T')[0], dueDate: inv.dueDate?.split('T')[0] || '', paymentMode: inv.paymentMode, paidAmount: String(inv.paidAmount ?? ''), notes: inv.notes || '', shipping: String(inv.shipping ?? ''), customer: inv.customer?._id || '', status: inv.status || '' });
        const mapped = inv.items.map(i => ({ name: i.name, quantity: String(i.quantity), rate: String(i.rate), discount: String(i.discount ?? ''), gstRate: i.gstRate, unit: i.unit || 'pcs', product: i.product?._id || i.product || '' }));
        setItems(mapped);
        setOriginalItems(mapped);
        setIsInterState(inv.isInterState);
      });
    }
  }, [id]);

  const calcItem = (item) => {
    const qty = parseInt(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    const gst = parseFloat(item.gstRate) || 0;
    const lineTotal = qty * rate;
    const discountAmt = (lineTotal * disc) / 100;
    const taxable = lineTotal - discountAmt;
    const tax = (taxable * gst) / 100;
    return { taxable, tax, total: taxable + tax };
  };

  const totals = items.reduce((acc, item) => {
    const { taxable, tax, total } = calcItem(item);
    return {
      subtotal: acc.subtotal + taxable,
      tax: acc.tax + tax,
      total: acc.total + total,
    };
  }, { subtotal: 0, tax: 0, total: 0 });

  const shipping = parseFloat(form.shipping) || 0;
  const paidAmount = parseFloat(form.paidAmount) || 0;
  const grandTotal = parseFloat((totals.total + shipping).toFixed(2));
  const dueAmount = parseFloat((grandTotal - paidAmount).toFixed(2));

  // On edit: available = current stock + original qty already deducted
  const getStock = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product) return null;
    if (isEdit) {
      const orig = originalItems.find(oi => (oi.product?._id || oi.product) === productId);
      return product.stock + (orig ? parseInt(orig.quantity || 0) : 0);
    }
    return product.stock;
  };

  const setItem = (i, field, value) => {
    const updated = [...items];
    if (field === 'quantity') value = value.replace(/[^0-9]/g, '');
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'product') {
      const p = products.find(p => p._id === value);
      if (p) updated[i] = { ...updated[i], name: p.name, rate: p.salePrice, gstRate: p.gstRate, unit: p.unit };
    }
    setItems(updated);
  };

  const hasStockError = items.some(item => {
    if (!item.product) return false;
    const stock = getStock(item.product);
    return stock !== null && Number(item.quantity) > stock;
  });

  const handleCustomer = (customerId) => {
    const c = customers.find(c => c._id === customerId);
    if (c) setForm(f => ({ ...f, customer: customerId, customerName: c.name, customerGstin: c.gstin || '', customerAddress: `${c.address?.line1 || ''}, ${c.address?.city || ''}, ${c.address?.state || ''}` }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.some(i => !i.name || Number(i.quantity) <= 0 || Number(i.rate) <= 0)) return toast.error('Fill all item details');
    if (hasStockError) return toast.error('One or more items exceed available stock');
    setLoading(true);
    try {
      const payload = { ...form, items, isInterState };
      if (!form.status) delete payload.status;
      if (isEdit) await invoiceAPI.update(id, payload);
      else await invoiceAPI.create(payload);
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created');
      navigate('/invoices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
        <p className="text-sm text-gray-500">GST-compliant tax invoice</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer & Invoice Details */}
        <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Select Customer</label>
            <select className="input" value={form.customer} onChange={e => handleCustomer(e.target.value)}>
              <option value="">-- Select or type below --</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Customer Name *</label>
            <input className="input" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Customer GSTIN</label>
            <input className="input" value={form.customerGstin} onChange={e => setForm(f => ({ ...f, customerGstin: e.target.value }))} placeholder="27XXXXX1234X1Z5" />
          </div>
          <div>
            <label className="label">Customer Address</label>
            <input className="input" value={form.customerAddress} onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} />
          </div>
          <div>
            <label className="label">Invoice Date *</label>
            <input type="date" className="input" value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 col-span-full">
            <input type="checkbox" id="interstate" checked={isInterState} onChange={e => setIsInterState(e.target.checked)} className="rounded" />
            <label htmlFor="interstate" className="text-sm text-gray-700 dark:text-gray-300">Inter-state sale (IGST applies)</label>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Invoice Items</h2>
          <div className="-mx-5 overflow-x-auto">
            <div className="min-w-[700px] px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Product', 'Qty', 'Rate (₹)', 'Disc %', 'GST %', 'Amount', ''].map(h => (
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
                        <select className="input text-xs mb-1" value={item.product || ''} onChange={e => setItem(i, 'product', e.target.value)}>
                          <option value="">Custom item</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <input className="input text-xs" value={item.name} onChange={e => setItem(i, 'name', e.target.value)} placeholder="Item name" required />
                      </td>
                      <td className="py-2 px-1 w-16">
                        <input type="text" inputMode="numeric" pattern="[0-9]*" className={`input text-xs ${item.product && getStock(item.product) !== null && Number(item.quantity) > getStock(item.product) ? 'border-red-500' : ''}`} value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                        {item.product && getStock(item.product) !== null && (
                          <span className={`text-xs mt-0.5 block ${Number(item.quantity) > getStock(item.product) ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            Stock: {getStock(item.product)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-1 w-24"><input type="number" min="0" step="0.01" className="input text-xs" value={item.rate} onChange={e => setItem(i, 'rate', e.target.value)} /></td>
                      <td className="py-2 px-1 w-16"><input type="number" min="0" max="100" className="input text-xs" value={item.discount} onChange={e => setItem(i, 'discount', e.target.value)} /></td>
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
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => {
                const s = e.target.value;
                setForm(f => ({
                  ...f,
                  status: s,
                  paidAmount: s === 'paid' ? String(grandTotal) : f.paidAmount,
                }));
              }}>
                <option value="">-- Auto --</option>
                {['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input type="number" min="0" step="0.01" className="input" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value, status: '' }))} />
            </div>
            <div>
              <label className="label">Shipping (₹)</label>
              <input type="number" min="0" step="0.01" className="input" value={form.shipping} onChange={e => setForm(f => ({ ...f, shipping: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Thank you for your business!" />
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{isInterState ? 'IGST' : 'CGST + SGST'}</span><span>{formatCurrency(totals.tax)}</span></div>
              {shipping > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatCurrency(shipping)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span>Grand Total</span><span className="text-primary-600">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{formatCurrency(paidAmount)}</span></div>
              <div className="flex justify-between text-red-500 font-semibold"><span>Due</span><span>{formatCurrency(dueAmount)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading || hasStockError} className="btn-primary disabled:opacity-50">{loading ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}</button>
        </div>
      </form>
    </div>
  );
}
