import { useEffect, useState } from 'react';
import { dashboardAPI } from '../api/services';
import { KPICard, Spinner, Badge } from '../components/ui';
import { formatCurrency, formatDate, getMonthName } from '../utils';
import { MdTrendingUp, MdPendingActions, MdInventory, MdAccountBalance, MdPeople } from 'react-icons/md';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { kpis, recentInvoices, lowStockProducts, monthlySales, topProducts } = data;

  const chartData = monthlySales.map(m => ({
    name: getMonthName(m._id.month),
    Sales: Math.round(m.total),
    Tax: Math.round(m.totalTax || 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500">Your business at a glance</p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary text-sm">+ New Invoice</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard title="Sales This Month" value={formatCurrency(kpis.salesThisMonth)} icon={MdTrendingUp} color="green" subtitle={`${kpis.salesCount} invoices`} />
        <KPICard title="Pending Dues" value={formatCurrency(kpis.pendingDues)} icon={MdPendingActions} color="red" subtitle={`${kpis.pendingCount} invoices`} />
        <KPICard title="Expenses" value={formatCurrency(kpis.expensesThisMonth)} icon={MdAccountBalance} color="blue" subtitle="This month" />
        <KPICard title="Low Stock" value={kpis.lowStockCount} icon={MdInventory} color="yellow" subtitle="Items need restock" />
        <KPICard title="Customers" value={kpis.totalCustomers} icon={MdPeople} color="blue" subtitle="Total registered" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales + Tax Chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Sales & Tax (This Year)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} width={55} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Sales" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Tax" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-10">No sales data yet</p>}
        </div>

        {/* Top Products */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Products</h2>
          <div className="space-y-3">
            {topProducts.length === 0 && <p className="text-sm text-gray-400">No data yet</p>}
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[110px]">{p._id}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(p.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Invoices */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Invoices</h2>
            <Link to="/invoices" className="text-xs text-primary-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-0">
            {recentInvoices.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No invoices yet</p>}
            {recentInvoices.map(inv => (
              <div key={inv._id} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <Link to={`/invoices/${inv._id}/print`} className="text-sm font-medium text-primary-600 hover:underline">{inv.invoiceNumber}</Link>
                  <p className="text-xs text-gray-500">{inv.customerName} · {formatDate(inv.invoiceDate)}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.grandTotal)}</p>
                    {inv.dueAmount > 0 && <p className="text-xs text-red-500">Due: {formatCurrency(inv.dueAmount)}</p>}
                  </div>
                  <Badge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Low Stock + Pending Dues */}
        <div className="space-y-5">
          {/* Pending Dues */}
          {kpis.pendingCount > 0 && (
            <div className="card border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pending Dues</h2>
                <Link to="/reports?tab=outstanding" className="text-xs text-primary-600 hover:underline">View →</Link>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(kpis.pendingDues)}</p>
              <p className="text-xs text-gray-500 mt-1">Across {kpis.pendingCount} invoice{kpis.pendingCount > 1 ? 's' : ''}</p>
              <Link to="/reminders" className="mt-3 block text-xs text-center btn-secondary py-1.5">Send Reminders</Link>
            </div>
          )}

          {/* Low Stock */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Low Stock</h2>
              <Link to="/inventory" className="text-xs text-primary-600 hover:underline">View all →</Link>
            </div>
            {lowStockProducts.length === 0
              ? <p className="text-sm text-gray-400 text-center py-3">All stock levels OK ✓</p>
              : lowStockProducts.map(p => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[130px]">{p.name}</p>
                  <span className="badge-red shrink-0">{p.stock} {p.unit}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
