import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { logoutUser } from '../../store/slices/authSlice';
import { MdMenu, MdDarkMode, MdLightMode, MdLogout, MdPerson, MdNotifications, MdInventory, MdWarning, MdSearch } from 'react-icons/md';
import { useState, useEffect, useRef } from 'react';
import { dashboardAPI } from '../../api/services';
import api from '../../api/axios';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { theme } = useSelector(s => s.ui);
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ invoices: [], customers: [], products: [] });
  const [searching, setSearching] = useState(false);
  const [alerts, setAlerts] = useState({ lowStock: [], overdue: 0 });
  const dropRef = useRef();
  const notifRef = useRef();
  const searchRef = useRef();
  const searchInputRef = useRef();

  useEffect(() => {
    dashboardAPI.get().then(r => {
      setAlerts({
        lowStock: r.data.lowStockProducts || [],
        overdue: r.data.kpis?.pendingCount || 0,
      });
    }).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults({ invoices: [], customers: [], products: [] }); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [inv, cust, prod] = await Promise.all([
          api.get('/invoices', { params: { search: searchQuery, limit: 4 } }),
          api.get('/customers', { params: { search: searchQuery, limit: 4 } }),
          api.get('/products', { params: { search: searchQuery, limit: 4 } }),
        ]);
        setSearchResults({
          invoices: inv.data.invoices || [],
          customers: cust.data.data || [],
          products: prod.data.data || [],
        });
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const totalAlerts = alerts.lowStock.length + (alerts.overdue > 0 ? 1 : 0);

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sticky top-0 z-10">
      <button onClick={() => dispatch(toggleSidebar())} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <MdMenu size={24} />
      </button>

      {/* Global Search — hidden on mobile, visible md+ */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4 relative" ref={searchRef}>
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-primary-400 focus:bg-white dark:focus:bg-gray-600 rounded-lg outline-none transition-colors"
            placeholder="Search invoices, customers, products..."
          />
          {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />}
        </div>

        {searchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
            {searchResults.invoices.length === 0 && searchResults.customers.length === 0 && searchResults.products.length === 0 && !searching && (
              <p className="text-sm text-gray-400 text-center py-4">No results found</p>
            )}

            {searchResults.invoices.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">Invoices</p>
                {searchResults.invoices.map(inv => (
                  <button key={inv._id} onClick={() => { navigate(`/invoices/${inv._id}/print`); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</span>
                    <span className="text-xs text-gray-500">{inv.customerName}</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.customers.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">Customers</p>
                {searchResults.customers.map(c => (
                  <button key={c._id} onClick={() => { navigate(`/customers/${c._id}`); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.phone || c.email || ''}</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.products.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">Products</p>
                {searchResults.products.map(p => (
                  <button key={p._id} onClick={() => { navigate('/inventory'); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.stock} {p.unit} · {p.sku || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button onClick={() => dispatch(toggleTheme())} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <MdNotifications size={22} />
            {totalAlerts > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-2 z-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-1">Alerts</p>

              {totalAlerts === 0 && (
                <p className="text-sm text-gray-500 px-4 py-3 text-center">No alerts — all good! ✓</p>
              )}

              {alerts.overdue > 0 && (
                <Link to="/invoices?status=overdue" onClick={() => setNotifOpen(false)}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-7 h-7 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <MdWarning size={14} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alerts.overdue} Pending Invoice{alerts.overdue > 1 ? 's' : ''}</p>
                    <p className="text-xs text-gray-500">Awaiting payment</p>
                  </div>
                </Link>
              )}

              {alerts.lowStock.slice(0, 5).map(p => (
                <Link key={p._id} to="/inventory?lowStock=true" onClick={() => setNotifOpen(false)}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-7 h-7 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <MdInventory size={14} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-500">Only {p.stock} {p.unit} left</p>
                  </div>
                </Link>
              ))}

              {alerts.lowStock.length > 5 && (
                <Link to="/inventory?lowStock=true" onClick={() => setNotifOpen(false)}
                  className="block text-center text-xs text-primary-600 hover:underline py-2">
                  +{alerts.lowStock.length - 5} more low stock items
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={dropRef}>
          <button onClick={() => setDropOpen(!dropOpen)} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block font-medium">{user?.name}</span>
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
              <button onClick={() => { navigate('/settings'); setDropOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <MdPerson size={16} /> Profile & Settings
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <MdLogout size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
