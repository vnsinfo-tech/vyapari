import { useEffect, useState } from 'react';
import { reportAPI } from '../api/services';
import { Spinner } from '../components/ui';
import { formatCurrency, getMonthName } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [gstData, setGstData] = useState({});
  const [plData, setPlData] = useState({});
  const [stockData, setStockData] = useState({ products: [], totalPurchaseValue: 0, totalSaleValue: 0 });
  const [outstanding, setOutstanding] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'sales') {
        const { data } = await reportAPI.sales({ ...dateRange, groupBy: 'month' });
        setSalesData(data.map(d => ({ name: getMonthName(d._id.month), Sales: Math.round(d.totalSales), Tax: Math.round(d.totalTax) })));
      } else if (tab === 'gst') {
        const { data } = await reportAPI.gst(dateRange);
        setGstData(data);
      } else if (tab === 'pl') {
        const { data } = await reportAPI.profitLoss(dateRange);
        setPlData(data);
      } else if (tab === 'stock') {
        const { data } = await reportAPI.stockValuation();
        setStockData(data);
      } else if (tab === 'outstanding') {
        const { data } = await reportAPI.outstanding();
        setOutstanding(data);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab, dateRange.startDate, dateRange.endDate]);

  const tabs = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'gst', label: 'GST Report' },
    { id: 'pl', label: 'Profit & Loss' },
    { id: 'stock', label: 'Stock Valuation' },
    { id: 'outstanding', label: 'Outstanding' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Financial insights for your business</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'sales' || tab === 'gst' || tab === 'pl') && (
        <div className="flex gap-3 flex-wrap">
          <div><label className="label">From</label><input type="date" className="input w-40" value={dateRange.startDate} onChange={e => setDateRange(d => ({ ...d, startDate: e.target.value }))} /></div>
          <div><label className="label">To</label><input type="date" className="input w-40" value={dateRange.endDate} onChange={e => setDateRange(d => ({ ...d, endDate: e.target.value }))} /></div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="card">
          {tab === 'sales' && (
            <>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Sales & Tax</h2>
              {salesData.length === 0 ? <p className="text-sm text-gray-400 text-center py-10">No data for selected range</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} width={55} />
                    <Tooltip formatter={v => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="Sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Tax" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}

          {tab === 'gst' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Sales GST Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total Sales</span><span className="font-medium">{formatCurrency(gstData.sales?.totalSales)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">CGST Collected</span><span className="font-medium">{formatCurrency(gstData.sales?.totalCgst)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SGST Collected</span><span className="font-medium">{formatCurrency(gstData.sales?.totalSgst)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">IGST Collected</span><span className="font-medium">{formatCurrency(gstData.sales?.totalIgst)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Total Tax Collected</span><span className="text-primary-600">{formatCurrency(gstData.sales?.totalTax)}</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Purchase GST Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total Purchases</span><span className="font-medium">{formatCurrency(gstData.purchases?.totalPurchases)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Total Tax Paid</span><span className="text-red-600">{formatCurrency(gstData.purchases?.totalTax)}</span></div>
                  <div className="flex justify-between font-bold text-green-600"><span>Net GST Payable</span><span>{formatCurrency((gstData.sales?.totalTax || 0) - (gstData.purchases?.totalTax || 0))}</span></div>
                </div>
              </div>
            </div>
          )}

          {tab === 'pl' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profit & Loss Statement</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Total Sales</span><span className="font-semibold text-green-600">{formatCurrency(plData.totalSales)}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Total Purchases</span><span className="font-semibold text-red-500">{formatCurrency(plData.totalPurchases)}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Gross Profit</span><span className="font-semibold">{formatCurrency(plData.grossProfit)}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Total Expenses</span><span className="font-semibold text-red-500">{formatCurrency(plData.totalExpenses)}</span></div>
                  <div className="flex justify-between py-2 text-base font-bold"><span>Net Profit</span><span className={plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(plData.netProfit)}</span></div>
                </div>
                <div>
                  <PieChart width={200} height={200}>
                    <Pie data={[{ name: 'Purchases', value: plData.totalPurchases || 0 }, { name: 'Expenses', value: plData.totalExpenses || 0 }, { name: 'Net Profit', value: Math.max(plData.netProfit || 0, 0) }]} cx={100} cy={100} outerRadius={80} dataKey="value">
                      {[0, 1, 2].map(i => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </div>
              </div>
            </div>
          )}

          {tab === 'stock' && (
            <div>
              <div className="flex gap-6 mb-4">
                <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600">Total Purchase Value</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(stockData.totalPurchaseValue)}</p>
                </div>
                <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600">Total Sale Value</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(stockData.totalSaleValue)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">{['Product', 'Stock', 'Purchase Price', 'Sale Price', 'Purchase Value', 'Sale Value'].map(h => <th key={h} className="text-left py-2 px-2 text-xs text-gray-500 font-semibold uppercase">{h}</th>)}</tr></thead>
                  <tbody>
                    {stockData.products.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-2 font-medium">{p.name}</td>
                        <td className="py-2 px-2">{p.stock}</td>
                        <td className="py-2 px-2">{formatCurrency(p.purchasePrice)}</td>
                        <td className="py-2 px-2">{formatCurrency(p.salePrice)}</td>
                        <td className="py-2 px-2 text-red-600">{formatCurrency(p.purchaseValue)}</td>
                        <td className="py-2 px-2 text-green-600">{formatCurrency(p.saleValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'outstanding' && (
            <div>
              <h2 className="text-sm font-semibold mb-4">Outstanding Invoices</h2>
              {outstanding.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No outstanding invoices 🎉</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200 dark:border-gray-700">{['Invoice', 'Customer', 'Due Date', 'Total', 'Due Amount'].map(h => <th key={h} className="text-left py-2 px-2 text-xs text-gray-500 font-semibold uppercase">{h}</th>)}</tr></thead>
                    <tbody>
                      {outstanding.map(inv => (
                        <tr key={inv._id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-2 px-2 font-medium text-primary-600">{inv.invoiceNumber}</td>
                          <td className="py-2 px-2">{inv.customerName}</td>
                          <td className="py-2 px-2 text-red-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="py-2 px-2">{formatCurrency(inv.grandTotal)}</td>
                          <td className="py-2 px-2 font-bold text-red-600">{formatCurrency(inv.dueAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
