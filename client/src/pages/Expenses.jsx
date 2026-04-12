import { useEffect, useState } from 'react';
import { expenseAPI } from '../api/services';
import { Spinner, EmptyState, Pagination, ConfirmDialog, Modal } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../constants';

const emptyForm = { category: 'Rent', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash', description: '', isRecurring: false };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sort, setSort] = useState('-date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = { page, sort };
      if (filterCategory) params.category = filterCategory;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await expenseAPI.list(params);
      setExpenses(data.data);
      setPages(data.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, sort, startDate, endDate, filterCategory]);

  const openEdit = (e) => { setForm({ category: e.category, amount: e.amount, date: e.date?.split('T')[0], paymentMode: e.paymentMode, description: e.description || '', isRecurring: e.isRecurring }); setEditId(e._id); setModal(true); };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editId) await expenseAPI.update(editId, form);
      else await expenseAPI.create(form);
      toast.success(editId ? 'Expense updated' : 'Expense added');
      setModal(false); fetch();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await expenseAPI.delete(deleteId);
    toast.success('Expense deleted');
    setDeleteId(null); fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500">Track your business expenses</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm"><MdAdd size={18} /> Add Expense</button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="input w-full sm:w-40">
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="input w-full sm:w-40">
            <option value="-date">Newest First</option>
            <option value="date">Oldest First</option>
          </select>
          <input type="date" className="input w-full sm:w-36" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} title="From date" />
          <input type="date" className="input w-full sm:w-36" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} title="To date" />
          {(startDate || endDate || filterCategory || sort !== '-date') && (
            <button onClick={() => { setSort('-date'); setStartDate(''); setEndDate(''); setFilterCategory(''); setPage(1); }} className="text-xs text-red-500 hover:underline whitespace-nowrap">Clear Filters</button>
          )}
        </div>
        {loading ? <Spinner /> : expenses.length === 0 ? (
          <EmptyState title="No expenses recorded" action={<button onClick={() => setModal(true)} className="btn-primary text-sm">Add Expense</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Category', 'Amount', 'Date', 'Payment Mode', 'Description', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{e.category}</td>
                    <td className="py-3 px-2 font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="py-3 px-2 text-gray-500">{formatDate(e.date)}</td>
                    <td className="py-3 px-2 text-gray-500 uppercase text-xs">{e.paymentMode}</td>
                    <td className="py-3 px-2 text-gray-500">{e.description || '-'}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={16} /></button>
                        <button onClick={() => setDeleteId(e._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={16} /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Expense' : 'Add Expense'} size="sm">
        <form onSubmit={handleSave} className="space-y-3">
          <div><label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Amount (₹) *</label><input type="number" min="0" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
          <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
          <div><label className="label">Payment Mode</label>
            <select className="input" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
              {PAYMENT_MODES.slice(0, 4).map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Expense" message="This will delete the expense permanently." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
