import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSidebar } from '../../store/slices/uiSlice';
import {
  MdDashboard, MdReceipt, MdPeople, MdInventory, MdShoppingCart,
  MdAccountBalance, MdBarChart, MdSettings, MdGroup, MdClose,
  MdLocalShipping, MdNotifications, MdCloudDownload,
} from 'react-icons/md';
import { useEffect, useRef } from 'react';

const allNavItems = [
  { to: '/dashboard',  icon: MdDashboard,     label: 'Dashboard',  permission: null },
  { to: '/invoices',   icon: MdReceipt,        label: 'Invoices',   permission: 'invoices' },
  { to: '/customers',  icon: MdPeople,         label: 'Customers',  permission: 'customers' },
  { to: '/suppliers',  icon: MdLocalShipping,  label: 'Suppliers',  permission: 'suppliers' },
  { to: '/inventory',  icon: MdInventory,      label: 'Inventory',  permission: 'inventory' },
  { to: '/purchases',  icon: MdShoppingCart,   label: 'Purchases',  permission: 'purchases' },
  { to: '/expenses',   icon: MdAccountBalance, label: 'Expenses',   permission: 'expenses' },
  { to: '/reports',    icon: MdBarChart,       label: 'Reports',    permission: 'reports' },
  { to: '/reminders',  icon: MdNotifications,  label: 'Reminders',  permission: 'invoices' },
  { to: '/staff',      icon: MdGroup,          label: 'Staff',      permission: 'staff' },
  { to: '/backup',     icon: MdCloudDownload,  label: 'Backup',     permission: 'settings' },
  { to: '/settings',   icon: MdSettings,       label: 'Settings',   permission: 'settings' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector(s => s.ui);
  const { business } = useSelector(s => s.auth);
  const permState = useSelector(s => s.permissions);

  // Build a can() checker — show all items until permissions are loaded (avoids flash)
  const can = (permission) => {
    if (!permission) return true;                          // Dashboard — always show
    if (!permState.loaded) return false;                   // Still loading — hide all gated items
    if (permState.isOwner) return true;                    // Business owner — full access
    if (!permState.permissions) return true;               // No restrictions set — full access
    return !!permState.permissions[permission];            // Check specific permission
  };

  const visibleItems = allNavItems.filter(item => can(item.permission));

  // Swipe to close on mobile
  const touchStartX = useRef(null);
  useEffect(() => {
    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      if (touchStartX.current === null) return;
      if (touchStartX.current - e.changedTouches[0].clientX > 60) dispatch(setSidebar(false));
      touchStartX.current = null;
    };
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [dispatch]);

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => dispatch(setSidebar(false))} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-60' : 'w-0 lg:w-16'} overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 min-w-[240px] lg:min-w-0">
          <div className={`flex items-center gap-2 ${!sidebarOpen && 'lg:hidden'}`}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">V</div>
            <span className="font-bold text-gray-900 dark:text-white text-sm truncate">{business?.name || 'Vyapari'}</span>
          </div>
          <div className={`hidden ${!sidebarOpen && 'lg:flex'} items-center justify-center w-full`}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">V</div>
          </div>
          <button onClick={() => dispatch(setSidebar(false))} className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <MdClose size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 min-w-[240px] lg:min-w-0">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`
              }>
              <Icon size={20} className="shrink-0" />
              <span className={`${!sidebarOpen && 'lg:hidden'} whitespace-nowrap`}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`p-4 border-t border-gray-200 dark:border-gray-700 ${!sidebarOpen && 'lg:hidden'}`}>
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3">
            <p className="text-xs font-medium text-primary-700 dark:text-primary-400">Free Plan</p>
            <p className="text-xs text-gray-500 mt-0.5">Upgrade for more features</p>
          </div>
        </div>
      </aside>
    </>
  );
}
