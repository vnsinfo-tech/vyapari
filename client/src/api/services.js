import api, { cachedGet, invalidateCache } from './axios';

const bust = (...prefixes) => prefixes.forEach(p => invalidateCache(p));

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
};

export const dashboardAPI = { get: () => cachedGet('/dashboard') };

export const invoiceAPI = {
  list: (params) => cachedGet('/invoices', { params }),
  get: (id) => cachedGet(`/invoices/${id}`),
  create: async (data) => { const r = await api.post('/invoices', data); bust('/invoices', '/dashboard'); return r; },
  update: async (id, data) => { const r = await api.put(`/invoices/${id}`, data); bust('/invoices', '/dashboard'); return r; },
  delete: async (id) => { const r = await api.delete(`/invoices/${id}`); bust('/invoices', '/dashboard'); return r; },
  pdfUrl: (id) => {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${base}/invoices/${id}/pdf?token=${token}`;
  },
};

export const customerAPI = {
  list: (params) => cachedGet('/customers', { params }),
  get: (id) => cachedGet(`/customers/${id}`),
  create: async (data) => { const r = await api.post('/customers', data); bust('/customers', '/dashboard'); return r; },
  update: async (id, data) => { const r = await api.put(`/customers/${id}`, data); bust('/customers'); return r; },
  delete: async (id) => { const r = await api.delete(`/customers/${id}`); bust('/customers', '/dashboard'); return r; },
};

export const supplierAPI = {
  list: (params) => cachedGet('/suppliers', { params }),
  get: (id) => cachedGet(`/suppliers/${id}`),
  create: async (data) => { const r = await api.post('/suppliers', data); bust('/suppliers'); return r; },
  update: async (id, data) => { const r = await api.put(`/suppliers/${id}`, data); bust('/suppliers'); return r; },
  delete: async (id) => { const r = await api.delete(`/suppliers/${id}`); bust('/suppliers'); return r; },
};

export const productAPI = {
  list: (params) => cachedGet('/products', { params }),
  get: (id) => cachedGet(`/products/${id}`),
  create: async (data) => { const r = await api.post('/products', data); bust('/products', '/dashboard'); return r; },
  update: async (id, data) => { const r = await api.put(`/products/${id}`, data); bust('/products'); return r; },
  delete: async (id) => { const r = await api.delete(`/products/${id}`); bust('/products', '/dashboard'); return r; },
  adjustStock: async (id, data) => { const r = await api.post(`/products/${id}/stock`, data); bust('/products', '/dashboard'); return r; },
};

export const categoryAPI = {
  list: () => cachedGet('/categories'),
  create: async (data) => { const r = await api.post('/categories', data); bust('/categories'); return r; },
  update: async (id, data) => { const r = await api.put(`/categories/${id}`, data); bust('/categories'); return r; },
  delete: async (id) => { const r = await api.delete(`/categories/${id}`); bust('/categories'); return r; },
};

export const purchaseAPI = {
  list: (params) => cachedGet('/purchases', { params }),
  get: (id) => cachedGet(`/purchases/${id}`),
  create: async (data) => { const r = await api.post('/purchases', data); bust('/purchases', '/dashboard'); return r; },
  update: async (id, data) => { const r = await api.put(`/purchases/${id}`, data); bust('/purchases'); return r; },
  delete: async (id) => { const r = await api.delete(`/purchases/${id}`); bust('/purchases', '/dashboard'); return r; },
};

export const expenseAPI = {
  list: (params) => cachedGet('/expenses', { params }),
  create: async (data) => { const r = await api.post('/expenses', data); bust('/expenses', '/dashboard'); return r; },
  update: async (id, data) => { const r = await api.put(`/expenses/${id}`, data); bust('/expenses'); return r; },
  delete: async (id) => { const r = await api.delete(`/expenses/${id}`); bust('/expenses', '/dashboard'); return r; },
};

export const paymentAPI = {
  list: () => cachedGet('/payments'),
  create: async (data) => { const r = await api.post('/payments', data); bust('/payments', '/dashboard'); return r; },
};

export const reportAPI = {
  sales: (params) => api.get('/reports/sales', { params }),
  gst: (params) => api.get('/reports/gst', { params }),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
  stockValuation: () => cachedGet('/reports/stock-valuation'),
  outstanding: () => api.get('/reports/outstanding'),
};

export const staffAPI = {
  list: () => cachedGet('/staff'),
  invite: async (data) => { const r = await api.post('/staff', data); bust('/staff'); return r; },
  update: async (id, data) => { const r = await api.put(`/staff/${id}`, data); bust('/staff'); return r; },
  remove: async (id) => { const r = await api.delete(`/staff/${id}`); bust('/staff'); return r; },
  getRoleDefaults: () => cachedGet('/staff/role-defaults'),
  getMyPermissions: () => api.get('/staff/my-permissions'),
};

export const settingsAPI = {
  get: () => cachedGet('/settings'),
  update: async (data) => { const r = await api.put('/settings', data); bust('/settings'); return r; },
  uploadLogo: (formData) => api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const reminderAPI = {
  list: () => cachedGet('/reminders'),
  send: (data) => api.post('/reminders/send', data),
};

export const backupAPI = {
  export: () => api.get('/backup/export', { responseType: 'blob' }),
  import: (data) => api.post('/backup/import', data),
};
