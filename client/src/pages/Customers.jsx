import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI } from '../api/services';
import { Spinner, EmptyState, Pagination, ConfirmDialog, Modal } from '../components/ui';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';
import { INDIAN_STATES } from '../constants';

const emptyForm = { name: '', phone: '', email: '', gstin: '', address: { line1: '', city: '', state: '', pincode: '' } };

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await customerAPI.list({ page, search });
      setCustomers(data.data);
      setPages(data.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, search]);

  const openEdit = (c) => { setForm({ name: c.name, phone: c.phone || '', email: c.email || '', gstin: c.gstin || '', address: c.address || emptyForm.address }); setEditId(c._id); setModal(true); };
  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await customerAPI.update(editId, form);
      else await customerAPI.create(form);
      toast.success(editId ? 'Customer updated' : 'Customer added');
      setModal(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await customerAPI.delete(deleteId);
    toast.success('Customer deleted');
    setDeleteId(null);
    fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500">Manage your customer accounts</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><MdAdd size={18} /> Add Customer</button>
      </div>

      <div className="card">
        <div className="relative mb-4">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Search by name or phone..." />
        </div>

        {loading ? <Spinner /> : customers.length === 0 ? (
          <EmptyState title="No customers yet" action={<button onClick={openNew} className="btn-primary text-sm">Add Customer</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Name', 'Phone', 'Email', 'GSTIN', 'City', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-primary-600 hover:underline cursor-pointer" onClick={() => navigate(`/customers/${c._id}`)}>{c.name}</td>
                    <td className="py-3 px-2 text-gray-500">{c.phone || '-'}</td>
                    <td className="py-3 px-2 text-gray-500">{c.email || '-'}</td>
                    <td className="py-3 px-2 text-gray-500 font-mono text-xs">{c.gstin || '-'}</td>
                    <td className="py-3 px-2 text-gray-500">{c.address?.city || '-'}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={16} /></button>
                        <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={16} /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="label">GSTIN</label><input className="input" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} placeholder="27XXXXX1234X1Z5" /></div>
            <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.address.line1} onChange={e => setForm(f => ({ ...f, address: { ...f.address, line1: e.target.value } }))} placeholder="Street address" /></div>
            <div><label className="label">City</label><input className="input" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} /></div>
            <div><label className="label">State</label>
              <select className="input" value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Pincode</label><input className="input" value={form.address.pincode} onChange={e => setForm(f => ({ ...f, address: { ...f.address, pincode: e.target.value } }))} /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Customer" message="This will delete the customer permanently." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
