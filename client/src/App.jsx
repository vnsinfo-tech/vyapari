import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { fetchMe } from './store/slices/authSlice';
import { fetchMyPermissions } from './store/slices/permissionsSlice';

import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import DashboardLayout from './components/layout/DashboardLayout';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import CreateInvoice from './pages/CreateInvoice';
import PrintInvoice from './pages/PrintInvoice';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import CreatePurchase from './pages/CreatePurchase';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import Reminders from './pages/Reminders';
import Backup from './pages/Backup';
import NotFound from './pages/NotFound';

const P = ({ perm, children }) => (
  <PermissionRoute permission={perm}>{children}</PermissionRoute>
);

function AppRoutes() {
  const dispatch = useDispatch();
  const { token } = useSelector(s => s.auth);
  const { theme } = useSelector(s => s.ui);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (token) {
      dispatch(fetchMe());
      dispatch(fetchMyPermissions());
    }
  }, [token, dispatch]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>

          <Route path="/dashboard" element={<Dashboard />} />

          {/* Invoices */}
          <Route path="/invoices" element={<P perm="invoices"><Invoices /></P>} />
          <Route path="/invoices/new" element={<P perm="invoices"><CreateInvoice /></P>} />
          <Route path="/invoices/:id" element={<P perm="invoices"><InvoiceDetail /></P>} />
          <Route path="/invoices/:id/edit" element={<P perm="invoices"><CreateInvoice /></P>} />
          <Route path="/invoices/:id/print" element={<P perm="invoices"><PrintInvoice /></P>} />

          {/* Customers */}
          <Route path="/customers" element={<P perm="customers"><Customers /></P>} />
          <Route path="/customers/:id" element={<P perm="customers"><CustomerDetail /></P>} />

          {/* Suppliers */}
          <Route path="/suppliers" element={<P perm="suppliers"><Suppliers /></P>} />
          <Route path="/suppliers/:id" element={<P perm="suppliers"><SupplierDetail /></P>} />

          {/* Inventory */}
          <Route path="/inventory" element={<P perm="inventory"><Inventory /></P>} />

          {/* Purchases */}
          <Route path="/purchases" element={<P perm="purchases"><Purchases /></P>} />
          <Route path="/purchases/new" element={<P perm="purchases"><CreatePurchase /></P>} />
          <Route path="/purchases/:id/edit" element={<P perm="purchases"><CreatePurchase /></P>} />

          {/* Expenses */}
          <Route path="/expenses" element={<P perm="expenses"><Expenses /></P>} />

          {/* Reports */}
          <Route path="/reports" element={<P perm="reports"><Reports /></P>} />

          {/* Reminders */}
          <Route path="/reminders" element={<P perm="invoices"><Reminders /></P>} />

          {/* Staff */}
          <Route path="/staff" element={<P perm="staff"><Staff /></P>} />

          {/* Backup & Settings */}
          <Route path="/backup" element={<P perm="settings"><Backup /></P>} />
          <Route path="/settings" element={<P perm="settings"><Settings /></P>} />

        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
        <SpeedInsights />
      </BrowserRouter>
    </Provider>
  );
}
