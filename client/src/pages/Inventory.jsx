import { useEffect, useState } from 'react';
import { productAPI, categoryAPI } from '../api/services';
import { Spinner, EmptyState, Pagination, ConfirmDialog, Modal } from '../components/ui';
import { formatCurrency } from '../utils';
import { MdAdd, MdSearch, MdEdit, MdDelete, MdTune, MdCategory } from 'react-icons/md';
import toast from 'react-hot-toast';
import { GST_RATES, UNITS } from '../constants';

const emptyForm = { name: '', sku: '', barcode: '', category: '', unit: 'pcs', salePrice: '', purchasePrice: '', mrp: '', gstRate: 18, hsnCode: '', stock: 0, lowStockAlert: 5, batchNumber: '', expiryDate: '', description: '' };

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockAdj, setStockAdj] = useState({ type: 'in', quantity: '', reason: '' });
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [catEditId, setCatEditId] = useState(null);
  const [catDeleteId, setCatDeleteId] = useState(null);
  const [catSaving, setCatSaving] = useState(false);

  const fetchCategories = () => categoryAPI.list().then(r => setCategories(r.data));

  const openCatEdit = (c) => { setCatForm({ name: c.name, description: c.description || '' }); setCatEditId(c._id); };
  const resetCatForm = () => { setCatForm({ name: '', description: '' }); setCatEditId(null); };

  const handleCatSave = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      if (catEditId) await categoryAPI.update(catEditId, catForm);
      else await categoryAPI.create(catForm);
      toast.success(catEditId ? 'Category updated' : 'Category added');
      resetCatForm(); fetchCategories();
    } catch { toast.error('Failed'); }
    finally { setCatSaving(false); }
  };

  const handleCatDelete = async () => {
    await categoryAPI.delete(catDeleteId);
    toast.success('Category deleted');
    setCatDeleteId(null); fetchCategories();
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.list({ page, search, lowStock: lowStock ? 'true' : '' });
      setProducts(data.data);
      setPages(data.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, search, lowStock]);
  useEffect(() => { fetchCategories(); }, []);

  const openEdit = (p) => {
    setForm({ name: p.name, sku: p.sku || '', barcode: p.barcode || '', category: p.category?._id || '', unit: p.unit, salePrice: p.salePrice, purchasePrice: p.purchasePrice, mrp: p.mrp || '', gstRate: p.gstRate, hsnCode: p.hsnCode || '', stock: p.stock, lowStockAlert: p.lowStockAlert, batchNumber: p.batchNumber || '', expiryDate: p.expiryDate?.split('T')[0] || '', description: p.description || '' });
    setEditId(p._id); setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await productAPI.update(editId, form);
      else await productAPI.create(form);
      toast.success(editId ? 'Product updated' : 'Product added');
      setModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStockAdjust = async () => {
    const qty = Number(stockAdj.quantity);
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
    if (stockAdj.type === 'out' && qty > stockModal.stock) return toast.error(`Cannot remove more than current stock (${stockModal.stock})`);
    if (stockAdj.type === 'set' && qty < 0) return toast.error('Stock cannot be negative');
    try {
      if (stockAdj.type === 'set') {
        // Set exact value: calculate delta and send as 'in' or 'out'
        const diff = qty - stockModal.stock;
        if (diff === 0) { setStockModal(null); return; }
        await productAPI.adjustStock(stockModal._id, {
          type: diff > 0 ? 'in' : 'out',
          quantity: Math.abs(diff),
          reason: stockAdj.reason || 'Manual set',
        });
      } else {
        await productAPI.adjustStock(stockModal._id, { ...stockAdj, quantity: qty });
      }
      toast.success('Stock updated');
      setStockModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    await productAPI.delete(deleteId);
    toast.success('Product deleted');
    setDeleteId(null); fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500">Manage products and stock</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCatModal(true)} className="btn-secondary flex items-center gap-2 text-sm"><MdCategory size={18} /> Categories</button>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm"><MdAdd size={18} /> Add Product</button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Search by name, SKU, barcode..." />
          </div>
          <button onClick={() => setLowStock(!lowStock)} className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors ${lowStock ? 'bg-red-50 border-red-300 text-red-700' : 'btn-secondary'}`}>
            <MdTune size={16} /> {lowStock ? 'Low Stock Only' : 'All Products'}
          </button>
        </div>

        {loading ? <Spinner /> : products.length === 0 ? (
          <EmptyState title="No products found" action={<button onClick={() => setModal(true)} className="btn-primary text-sm">Add Product</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Product', 'SKU', 'Category', 'Sale Price', 'Purchase Price', 'GST', 'Stock', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="py-3 px-2 text-gray-500 font-mono text-xs">{p.sku || '-'}</td>
                    <td className="py-3 px-2 text-gray-500">{p.category?.name || '-'}</td>
                    <td className="py-3 px-2 font-medium">{formatCurrency(p.salePrice)}</td>
                    <td className="py-3 px-2 text-gray-500">{formatCurrency(p.purchasePrice)}</td>
                    <td className="py-3 px-2 text-gray-500">{p.gstRate}%</td>
                    <td className="py-3 px-2">
                      <span className={p.stock <= p.lowStockAlert ? 'badge-red' : 'badge-green'}>{p.stock} {p.unit}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => { setStockModal(p); setStockAdj({ type: 'in', quantity: '', reason: '' }); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded text-xs border border-gray-200 dark:border-gray-600">Stock</button>
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={16} /></button>
                        <button onClick={() => setDeleteId(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {/* Product Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Product Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
          <div><label className="label">Barcode</label><input className="input" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} /></div>
          <div><label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">None</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div><label className="label">Sale Price (₹) *</label><input type="number" min="0" className="input" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} required /></div>
          <div><label className="label">Purchase Price (₹)</label><input type="number" min="0" className="input" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} /></div>
          <div><label className="label">MRP (₹)</label><input type="number" min="0" className="input" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} /></div>
          <div><label className="label">GST Rate</label>
            <select className="input" value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: +e.target.value }))}>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div><label className="label">HSN Code</label><input className="input" value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} /></div>
          <div><label className="label">Opening Stock</label><input type="number" min="0" className="input" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
          <div><label className="label">Low Stock Alert</label><input type="number" min="0" className="input" value={form.lowStockAlert} onChange={e => setForm(f => ({ ...f, lowStockAlert: e.target.value }))} /></div>
          <div><label className="label">Batch Number</label><input className="input" value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} /></div>
          <div><label className="label">Expiry Date</label><input type="date" className="input" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
          <div className="col-span-2 flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Adjust Stock — ${stockModal?.name}`} size="sm">
        <div className="space-y-3">
          {/* Current stock */}
          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-500">Current Stock</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{stockModal?.stock} <span className="text-sm font-normal text-gray-400">{stockModal?.unit}</span></span>
          </div>

          {/* Type selector */}
          <div>
            <label className="label">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'in',  label: 'Add Stock',    color: 'green' },
                { value: 'out', label: 'Remove Stock',  color: 'red' },
                { value: 'set', label: 'Set Exact',     color: 'blue' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStockAdj(s => ({ ...s, type: value, quantity: '' }))}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    stockAdj.type === value
                      ? color === 'green' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : color === 'red'   ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      :                    'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <label className="label">
              {stockAdj.type === 'in'  && 'Quantity to Add'}
              {stockAdj.type === 'out' && 'Quantity to Remove'}
              {stockAdj.type === 'set' && 'New Stock Value'}
            </label>
            <input
              type="number"
              min={stockAdj.type === 'set' ? '0' : '1'}
              className="input text-lg font-semibold"
              value={stockAdj.quantity}
              placeholder={stockAdj.type === 'set' ? `Current: ${stockModal?.stock}` : '0'}
              onChange={e => setStockAdj(s => ({ ...s, quantity: e.target.value }))}
            />
          </div>

          {/* Live math preview */}
          {stockAdj.quantity !== '' && Number(stockAdj.quantity) >= 0 && (() => {
            const qty = Number(stockAdj.quantity);
            const current = stockModal?.stock ?? 0;
            let newStock, equation, color;
            if (stockAdj.type === 'in') {
              newStock = current + qty;
              equation = `${current} + ${qty} = ${newStock}`;
              color = 'text-green-600';
            } else if (stockAdj.type === 'out') {
              newStock = current - qty;
              equation = `${current} − ${qty} = ${newStock}`;
              color = newStock < 0 ? 'text-red-600' : 'text-orange-500';
            } else {
              newStock = qty;
              const diff = qty - current;
              equation = diff === 0 ? `No change (${current})` : diff > 0 ? `${current} + ${diff} = ${newStock}` : `${current} − ${Math.abs(diff)} = ${newStock}`;
              color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-orange-500' : 'text-gray-500';
            }
            return (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-500">New Stock</span>
                <div className="text-right">
                  <span className={`text-base font-mono font-bold ${color}`}>{equation}</span>
                  {newStock < 0 && <p className="text-xs text-red-500 mt-0.5">Cannot go below 0</p>}
                </div>
              </div>
            );
          })()}

          {/* Reason */}
          <div>
            <label className="label">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" value={stockAdj.reason} onChange={e => setStockAdj(s => ({ ...s, reason: e.target.value }))} placeholder="Purchase, damage, return, correction..." />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setStockModal(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleStockAdjust}
              disabled={
                stockAdj.quantity === '' ||
                (stockAdj.type === 'out' && Number(stockAdj.quantity) > (stockModal?.stock ?? 0)) ||
                (stockAdj.type !== 'set' && Number(stockAdj.quantity) <= 0) ||
                (stockAdj.type === 'set' && Number(stockAdj.quantity) < 0)
              }
              className="btn-primary disabled:opacity-40">
              Update Stock
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Product" message="This will delete the product permanently." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      {/* Category Management Modal */}
      <Modal open={catModal} onClose={() => { setCatModal(false); resetCatForm(); }} title="Manage Categories" size="md">
        <div className="space-y-4">
          <form onSubmit={handleCatSave} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">{catEditId ? 'Edit Category' : 'New Category'}</label>
              <input className="input" placeholder="Category name" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="flex-1">
              <label className="label">Description</label>
              <input className="input" placeholder="Optional" value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <button type="submit" disabled={catSaving} className="btn-primary whitespace-nowrap">{catEditId ? 'Update' : 'Add'}</button>
            {catEditId && <button type="button" onClick={resetCatForm} className="btn-secondary">Cancel</button>}
          </form>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
            {categories.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">No categories yet</p>}
            {categories.map(c => (
              <div key={c._id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                  {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openCatEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={15} /></button>
                  <button onClick={() => setCatDeleteId(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!catDeleteId} title="Delete Category" message="Delete this category? Products using it will be unaffected." onConfirm={handleCatDelete} onCancel={() => setCatDeleteId(null)} />
    </div>
  );
}
