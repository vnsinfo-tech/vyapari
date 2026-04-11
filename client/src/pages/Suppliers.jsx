import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierAPI } from '../api/services';
import { Spinner, EmptyState, Pagination, ConfirmDialog, Modal } from '../components/ui';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';
import { INDIAN_STATES } from '../constants';

const emptyForm = { name: '', phone: '', email: '', gstin: '', address: { line1: '', city: '', state: '', pincode: '' } };

export default function Suppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
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
      const { data } = await supplierAPI.list({ page, search });
      setSuppliers(data.data);
      setPages(data.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, search]);

  const openEdit = (s) => { setForm({ name: s.name, phone: s.phone || '', email: s.email || '', gstin: s.gstin || '', address: s.address || emptyForm.address }); setEditId(s._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await supplierAPI.update(editId, form);
      else await supplierAPI.create(form);
      toast.success(editId ? 'Supplier updated' : 'Supplier added');
      setModal(false); fetch();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await supplierAPI.delete(deleteId);
    toast.success('Supplier deleted');
    setDeleteId(null); fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Suppliers</h1><p className="text-sm text-gray-500">Manage your suppliers</p></div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm"><MdAdd size={18} /> Add Supplier</button>
      </div>
      <div className="card">
        <div className="relative mb-4"><MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Search suppliers..." /></div>
        {loading ? <Spinner /> : suppliers.length === 0 ? <EmptyState title="No suppliers yet" action={<button onClick={() => setModal(true)} className="btn-primary text-sm">Add Supplier</button>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">{['Name', 'Phone', 'Email', 'GSTIN', 'City', 'Actions'].map(h => <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-primary-600 hover:underline cursor-pointer" onClick={() => navigate(`/suppliers/${s._id}`)}>{s.name}</td>
                    <td className="py-3 px-2 text-gray-500">{s.phone || '-'}</td>
                    <td className="py-3 px-2 text-gray-500">{s.email || '-'}</td>
                    <td className="py-3 px-2 text-gray-500 font-mono text-xs">{s.gstin || '-'}</td>
                    <td className="py-3 px-2 text-gray-500">{s.address?.city || '-'}</td>
                    <td className="py-3 px-2"><div className="flex gap-1"><button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={16} /></button><button onClick={() => setDeleteId(s._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="col-span-2"><label className="label">GSTIN</label><input className="input" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} /></div>
            <div><label className="label">City</label><input className="input" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} /></div>
            <div><label className="label">State</label><select className="input" value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}><option value="">Select</option>{INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="flex gap-3 justify-end pt-2"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} title="Delete Supplier" message="This will delete the supplier permanently." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
