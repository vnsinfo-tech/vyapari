import api, { cachedGet } from './axios';

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
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  pdfUrl: (id) => {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${base}/invoices/${id}/pdf?token=${token}`;
  },
};

export const customerAPI = {
  list: (params) => cachedGet('/customers', { params }),
  get: (id) => cachedGet(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const supplierAPI = {
  list: (params) => cachedGet('/suppliers', { params }),
  get: (id) => cachedGet(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

export const productAPI = {
  list: (params) => cachedGet('/products', { params }),
  get: (id) => cachedGet(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, data) => api.post(`/products/${id}/stock`, data),
};

export const categoryAPI = {
  list: () => cachedGet('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const purchaseAPI = {
  list: (params) => cachedGet('/purchases', { params }),
  get: (id) => cachedGet(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  update: (id, data) => api.put(`/purchases/${id}`, data),
  delete: (id) => api.delete(`/purchases/${id}`),
};

export const expenseAPI = {
  list: (params) => cachedGet('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const paymentAPI = {
  list: () => cachedGet('/payments'),
  create: (data) => api.post('/payments', data),
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
  invite: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
  getRoleDefaults: () => cachedGet('/staff/role-defaults'),
  getMyPermissions: () => api.get('/staff/my-permissions'),
};

export const settingsAPI = {
  get: () => cachedGet('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (formData) => api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const reminderAPI = {
  list: () => cachedGet('/reminders'),
  send: (data) => api.post('/reminders/send', data),
};

export const backupAPI = {
  export: () => api.get('/backup/export', { responseType: 'blob' }),
};
