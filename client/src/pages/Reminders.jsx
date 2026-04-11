import { useEffect, useState } from 'react';
import { reminderAPI, invoiceAPI } from '../api/services';
import { Spinner, EmptyState, Modal } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { MdSend, MdWhatsapp, MdEmail } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ invoiceId: '', channel: 'email', whatsappNumber: '' });
  const [sending, setSending] = useState(false);

  const fetchAll = () => {
    reminderAPI.list().then(r => setReminders(r.data)).finally(() => setLoading(false));
    invoiceAPI.list({ status: 'sent', limit: 100 }).then(r => setInvoices(r.data.invoices || []));
    // Also fetch overdue
    invoiceAPI.list({ status: 'overdue', limit: 100 }).then(r => {
      setInvoices(prev => {
        const ids = new Set(prev.map(i => i._id));
        return [...prev, ...(r.data.invoices || []).filter(i => !ids.has(i._id))];
      });
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await reminderAPI.send(form);
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
        toast.success('WhatsApp opened');
      } else {
        toast.success('Reminder sent!');
      }
      setModal(false);
      setForm({ invoiceId: '', channel: 'email', whatsappNumber: '' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSending(false); }
  };

  const channelIcon = { email: <MdEmail size={14} />, whatsapp: <MdWhatsapp size={14} />, sms: <MdSend size={14} /> };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment Reminders</h1>
          <p className="text-sm text-gray-500">Send reminders for unpaid invoices</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <MdSend size={18} /> Send Reminder
        </button>
      </div>

      <div className="card">
        {loading ? <Spinner /> : reminders.length === 0 ? (
          <EmptyState title="No reminders sent yet" description="Send your first payment reminder" action={<button onClick={() => setModal(true)} className="btn-primary text-sm">Send Reminder</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Customer', 'Invoice', 'Amount Due', 'Due Date', 'Channel', 'Status', 'Sent At'].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reminders.map(r => (
                  <tr key={r._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{r.customerName}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{r.invoice?.invoiceNumber || '-'}</td>
                    <td className="py-3 px-2 text-red-600 font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="py-3 px-2 text-gray-500">{formatDate(r.dueDate)}</td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 capitalize">
                        {channelIcon[r.channel]} {r.channel}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={r.status === 'sent' ? 'badge-green' : r.status === 'failed' ? 'badge-red' : 'badge-yellow'}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500">{r.sentAt ? formatDate(r.sentAt) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Send Payment Reminder" size="sm">
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="label">Select Invoice *</label>
            <select className="input" value={form.invoiceId} onChange={e => setForm(f => ({ ...f, invoiceId: e.target.value }))} required>
              <option value="">-- Select unpaid invoice --</option>
              {invoices.map(inv => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} — {inv.customerName} (Due: {formatCurrency(inv.dueAmount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'email', label: 'Email', icon: MdEmail },
                { value: 'whatsapp', label: 'WhatsApp', icon: MdWhatsapp },
                { value: 'sms', label: 'SMS', icon: MdSend },
              ].map(({ value, label, icon: Icon }) => (
                <button key={value} type="button"
                  onClick={() => setForm(f => ({ ...f, channel: value }))}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    form.channel === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                  }`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          {form.channel === 'whatsapp' && (
            <div>
              <label className="label">WhatsApp Number</label>
              <input className="input" value={form.whatsappNumber}
                onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                placeholder="91XXXXXXXXXX (with country code)" />
              <p className="text-xs text-gray-400 mt-1">Leave blank to use customer's saved number</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={sending || !form.invoiceId} className="btn-primary flex items-center gap-2">
              {form.channel === 'whatsapp' ? <MdWhatsapp size={16} /> : <MdSend size={16} />}
              {sending ? 'Sending...' : form.channel === 'whatsapp' ? 'Open WhatsApp' : 'Send'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
