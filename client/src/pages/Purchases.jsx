import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseAPI } from '../api/services';
import { Badge, Spinner, EmptyState, Pagination, ConfirmDialog } from '../components/ui';
import { formatCurrency, formatDate } from '../utils';
import { MdAdd, MdSearch, MdDelete, MdEdit } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Purchases() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await purchaseAPI.list({ page, search });
      setPurchases(data.data);
      setPages(data.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => { purchaseAPI.fixAmounts(); }, []);
  useEffect(() => { fetch(); }, [page, search]);

  const handleDelete = async () => {
    await purchaseAPI.delete(deleteId);
    toast.success('Purchase deleted');
    setDeleteId(null); fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Purchases</h1><p className="text-sm text-gray-500">Track your purchase orders</p></div>
        <button onClick={() => navigate('/purchases/new')} className="btn-primary flex items-center gap-2 text-sm"><MdAdd size={18} /> New Purchase</button>
      </div>
      <div className="card">
        <div className="relative mb-4"><MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input pl-9" placeholder="Search by supplier..." /></div>
        {loading ? <Spinner /> : purchases.length === 0 ? <EmptyState title="No purchases yet" action={<button onClick={() => navigate('/purchases/new')} className="btn-primary text-sm">Add Purchase</button>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">{['Bill #', 'Supplier', 'Date', 'Total', 'Paid', 'Due', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-medium text-primary-600">{p.billNumber || '-'}</td>
                    <td className="py-3 px-2">{p.supplierName || p.supplier?.name || '-'}</td>
                    <td className="py-3 px-2 text-gray-500">{formatDate(p.purchaseDate)}</td>
                    <td className="py-3 px-2 font-semibold">{formatCurrency(p.grandTotal)}</td>
                    <td className="py-3 px-2 text-green-600 dark:text-green-400">{formatCurrency(p.paidAmount ?? 0)}</td>
                    <td className="py-3 px-2 text-red-500 dark:text-red-400">{formatCurrency(p.dueAmount ?? (p.grandTotal - (p.paidAmount ?? 0)))}</td>
                    <td className="py-3 px-2"><Badge status={p.status} /></td>
                    <td className="py-3 px-2"><div className="flex gap-1"><button onClick={() => navigate(`/purchases/${p._id}/edit`)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><MdEdit size={16} /></button><button onClick={() => setDeleteId(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><MdDelete size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
      <ConfirmDialog open={!!deleteId} title="Delete Purchase" message="This will delete the purchase permanently." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
