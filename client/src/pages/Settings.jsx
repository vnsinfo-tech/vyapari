import { useEffect, useState } from 'react';
import { settingsAPI } from '../api/services';
import { useDispatch } from 'react-redux';
import { updateBusiness } from '../store/slices/authSlice';
import toast from 'react-hot-toast';
import { BUSINESS_TYPES, INDIAN_STATES } from '../constants';

export default function Settings() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: '', type: 'retailer', gstin: '', pan: '', phone: '', email: '', address: { line1: '', city: '', state: '', pincode: '' }, invoicePrefix: 'INV', language: 'en', currency: 'INR' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    settingsAPI.get().then(r => {
      const b = r.data;
      setForm({ name: b.name || '', type: b.type || 'retailer', gstin: b.gstin || '', pan: b.pan || '', phone: b.phone || '', email: b.email || '', address: b.address || { line1: '', city: '', state: '', pincode: '' }, invoicePrefix: b.invoicePrefix || 'INV', language: b.language || 'en', currency: b.currency || 'INR' });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await settingsAPI.update(form);
      dispatch(updateBusiness(data));
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    const fd = new FormData();
    fd.append('logo', logoFile);
    try {
      await settingsAPI.uploadLogo(fd);
      toast.success('Logo uploaded');
    } catch { toast.error('Upload failed'); }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" /></div>;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500">Manage your business profile</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Business Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full"><label className="label">Business Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Business Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">GSTIN</label><input className="input" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} placeholder="27XXXXX1234X1Z5" /></div>
            <div><label className="label">PAN</label><input className="input" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value }))} /></div>
            <div><label className="label">Invoice Prefix</label><input className="input" value={form.invoicePrefix} onChange={e => setForm(f => ({ ...f, invoicePrefix: e.target.value }))} /></div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full"><label className="label">Street Address</label><input className="input" value={form.address.line1} onChange={e => setForm(f => ({ ...f, address: { ...f.address, line1: e.target.value } }))} /></div>
            <div><label className="label">City</label><input className="input" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} /></div>
            <div><label className="label">State</label>
              <select className="input" value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Pincode</label><input className="input" value={form.address.pincode} onChange={e => setForm(f => ({ ...f, address: { ...f.address, pincode: e.target.value } }))} /></div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Language</label>
              <select className="input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>
            <div><label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="INR">INR (Rs.)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Business Logo</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="text-sm text-gray-500" />
            <button type="button" onClick={handleLogoUpload} disabled={!logoFile} className="btn-secondary text-sm">Upload</button>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">{saving ? 'Saving...' : 'Save Settings'}</button>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Data Backup</h2>
          <p className="text-sm text-gray-500 mb-3">Export all your business data as a JSON backup file.</p>
          <a href="/backup" className="btn-secondary text-sm inline-flex items-center gap-2">Go to Backup & Export →</a>
        </div>
      </form>
    </div>
  );
}
