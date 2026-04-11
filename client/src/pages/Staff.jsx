import { useEffect, useState } from 'react';
import { staffAPI } from '../api/services';
import { Spinner, EmptyState, Modal, ConfirmDialog } from '../components/ui';
import { MdAdd, MdEdit, MdPersonOff, MdPersonAdd, MdShield } from 'react-icons/md';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'manager', 'accountant', 'cashier'];

const PERM_KEYS = [
  { key: 'invoices',  label: 'Invoices' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'expenses',  label: 'Expenses' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'reports',   label: 'Reports' },
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'staff',     label: 'Staff' },
  { key: 'settings',  label: 'Settings' },
];

const ROLE_COLORS = {
  admin:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manager:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accountant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cashier:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const ROLE_DESC = {
  admin:      'Full access to everything',
  manager:    'All modules except staff & settings',
  accountant: 'Invoices, purchases, expenses & reports',
  cashier:    'Invoices and customers only',
};

const emptyForm = {
  name: '', email: '', password: '', role: 'cashier',
  permissions: { invoices: true, purchases: false, expenses: false, inventory: false, reports: false, customers: true, suppliers: false, staff: false, settings: false },
};

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [roleDefaults, setRoleDefaults] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null); // staffRole being edited
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(null);
  const [deactivateId, setDeactivateId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const staffRes = await staffAPI.list();
      setStaff(staffRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load staff');
    } finally { setLoading(false); }

    // Load role defaults separately — non-blocking
    try {
      const defaultsRes = await staffAPI.getRoleDefaults();
      setRoleDefaults(defaultsRes.data);
    } catch { /* silently ignore */ }
  };

  useEffect(() => { fetchAll(); }, []);

  // When role changes in invite form, auto-apply role defaults
  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role, permissions: roleDefaults[role] || f.permissions }));
  };

  // When role changes in edit form, auto-apply role defaults
  const handleEditRoleChange = (role) => {
    setEditForm(f => ({ ...f, role, permissions: roleDefaults[role] || f.permissions }));
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await staffAPI.invite(form);
      toast.success('Staff member added');
      setModal(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const openEdit = (s) => {
    setEditForm({ role: s.role, permissions: { ...s.permissions } });
    setEditModal(s);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await staffAPI.update(editModal._id, editForm);
      toast.success('Staff updated');
      setEditModal(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async () => {
    const s = staff.find(x => x._id === deactivateId);
    try {
      await staffAPI.update(deactivateId, { isActive: !s.isActive });
      toast.success(s.isActive ? 'Staff deactivated' : 'Staff reactivated');
      setDeactivateId(null);
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const activeCount = staff.filter(s => s.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Staff & Roles</h1>
          <p className="text-sm text-gray-500">{activeCount} active member{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <MdAdd size={18} /> Add Staff
        </button>
      </div>

      {/* Role overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map(role => (
          <div key={role} className="card py-3">
            <div className="flex items-center gap-2 mb-1">
              <MdShield size={16} className="text-gray-400" />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[role]}`}>{role}</span>
            </div>
            <p className="text-xs text-gray-500">{ROLE_DESC[role]}</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
              {staff.filter(s => s.role === role && s.isActive).length} member{staff.filter(s => s.role === role && s.isActive).length !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Staff table */}
      <div className="card">
        {loading ? <Spinner /> : staff.length === 0 ? (
          <EmptyState title="No staff members yet" description="Add staff to delegate access" action={<button onClick={() => setModal(true)} className="btn-primary text-sm">Add Staff</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Name', 'Email', 'Role', 'Permissions', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s._id} className={`border-b border-gray-100 dark:border-gray-700 ${!s.isActive ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{s.user?.name}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{s.user?.email}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[s.role]}`}>{s.role}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {PERM_KEYS.filter(p => s.permissions?.[p.key]).map(p => (
                          <span key={p.key} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{p.label}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={s.isActive ? 'badge-green' : 'badge-red'}>{s.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} title="Edit permissions" className="p-1.5 text-gray-400 hover:text-primary-600 rounded">
                          <MdEdit size={16} />
                        </button>
                        <button onClick={() => setDeactivateId(s._id)} title={s.isActive ? 'Deactivate' : 'Reactivate'}
                          className={`p-1.5 rounded ${s.isActive ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}>
                          {s.isActive ? <MdPersonOff size={16} /> : <MdPersonAdd size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Staff Member" size="md">
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{ROLE_DESC[form.role]}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Permissions</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, permissions: roleDefaults[f.role] || f.permissions }))}
                className="text-xs text-primary-600 hover:underline">Reset to role defaults</button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {PERM_KEYS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={!!form.permissions[key]}
                    onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: e.target.checked } }))}
                    className="rounded accent-primary-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add Staff'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit — ${editModal?.user?.name}`} size="md">
        {editForm && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="label">Role</label>
              <select className="input" value={editForm.role} onChange={e => handleEditRoleChange(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">{ROLE_DESC[editForm.role]}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Permissions</label>
                <button type="button" onClick={() => setEditForm(f => ({ ...f, permissions: roleDefaults[f.role] || f.permissions }))}
                  className="text-xs text-primary-600 hover:underline">Reset to role defaults</button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {PERM_KEYS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={!!editForm.permissions[key]}
                      onChange={e => setEditForm(f => ({ ...f, permissions: { ...f.permissions, [key]: e.target.checked } }))}
                      className="rounded accent-primary-600" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Deactivate / Reactivate confirm */}
      <ConfirmDialog
        open={!!deactivateId}
        title={staff.find(s => s._id === deactivateId)?.isActive ? 'Deactivate Staff' : 'Reactivate Staff'}
        message={staff.find(s => s._id === deactivateId)?.isActive
          ? 'This will revoke their access immediately.'
          : 'This will restore their access.'}
        onConfirm={handleToggleActive}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  );
}
