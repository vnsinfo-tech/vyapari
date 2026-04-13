import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { invoiceAPI } from '../api/services';
import { Badge, Spinner, EmptyState, Pagination, ConfirmDialog } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { shareOnWhatsApp } from '../utils/invoiceUtils';
import { MdAdd, MdSearch, MdDelete, MdEdit, MdPrint, MdWhatsapp } from 'react-icons/md';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  draft: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300',
  sent: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  paid: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  partial: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
  overdue: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  cancelled: 'text-gray-400 bg-gray-100 dark:bg-gray-700',
};

const STATUSES = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-invoiceDate');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = { page, sort };
      if (search) params.search = search;
      if (status) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await invoiceAPI.list(params);
      setInvoices(data.invoices || []);
      setPages(data.pages || 1);
    } catch { setInvoices([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, [page, search, status, sort, startDate, endDate]);

  const handleDelete = async () => {
    await invoiceAPI.delete(deleteId);
    toast.success('Invoice deleted');
    setDeleteId(null);
    fetchInvoices();
  };

  const handleStatusChange = async (inv, newStatus) => {
    try {
      const paidAmount = newStatus === 'paid'
        ? inv.grandTotal
        : newStatus === 'partial' ? inv.paidAmount
        : newStatus === 'draft' || newStatus === 'cancelled' ? 0
        : inv.paidAmount;
      await invoiceAPI.update(inv._id, { ...inv, status: newStatus, paidAmount, customer: inv.customer?._id || inv.customer });
      toast.success('Status updated');
      fetchInvoices();
    } catch { toast.error('Failed to update status'); }
  };

  const handleWhatsApp = (inv) => shareOnWhatsApp(inv);


  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-gray-500">Manage your sales invoices</p>
        </div>
        <Link to="/invoices/new" className="btn-primary flex items-center gap-2 text-sm">
          <MdAdd size={18} /> New Invoice
        </Link>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Search invoice or customer..." />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-full sm:w-36">
            <option value="">All Status</option>
            {['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="input w-full sm:w-40">
            <option value="-invoiceDate">Newest First</option>
            <option value="invoiceDate">Oldest First</option>
          </select>
          <input type="date" className="input w-full sm:w-36" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} placeholder="From" title="From date" />
          <input type="date" className="input w-full sm:w-36" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} placeholder="To" title="To date" />
          {(startDate || endDate || status || sort !== '-invoiceDate') && (
            <button onClick={() => { setStatus(''); setSort('-invoiceDate'); setStartDate(''); setEndDate(''); setPage(1); }} className="text-xs text-red-500 hover:underline whitespace-nowrap">Clear Filters</button>
          )}
        </div>

        {loading ? <Spinner /> : invoices.length === 0 ? (
          <EmptyState title="No invoices found" description="Create your first invoice to get started" action={<Link to="/invoices/new" className="btn-primary text-sm">Create Invoice</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Invoice #', 'Customer', 'Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-primary-600"><Link to={`/invoices/${inv._id}`}>{inv.invoiceNumber}</Link></td>
                    <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{inv.customerName}</td>
                    <td className="py-3 px-2 text-gray-500">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-2 text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.grandTotal)}</td>
                    <td className="py-3 px-2">
                      <select
                        value={inv.status}
                        onChange={e => handleStatusChange(inv, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-2 py-1 border-0 outline-none cursor-pointer ${STATUS_COLORS[inv.status] || ''}`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/invoices/${inv._id}/edit`)} title="Edit" className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={16} /></button>
                        <button onClick={() => navigate(`/invoices/${inv._id}/print`)} title="Print / Download PDF" className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><MdPrint size={16} /></button>
                        <button onClick={() => handleWhatsApp(inv)} title="Share on WhatsApp" className="p-1.5 text-gray-400 hover:text-green-500 rounded"><MdWhatsapp size={16} /></button>
                        <button onClick={() => setDeleteId(inv._id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={16} /></button>
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

      <ConfirmDialog open={!!deleteId} title="Delete Invoice" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
