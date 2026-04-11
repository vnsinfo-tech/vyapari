export const GST_RATES = [0, 5, 12, 18, 28];

export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque', 'credit'];

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];

export const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Salary', 'Transport', 'Marketing', 'Maintenance', 'Office Supplies', 'Internet', 'Insurance', 'Other'];

export const BUSINESS_TYPES = ['retailer', 'wholesaler', 'distributor', 'manufacturer', 'service'];

export const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'bag', 'dozen', 'meter', 'sqft'];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
];

export const STATUS_COLORS = {
  paid: 'badge-green', sent: 'badge-blue', partial: 'badge-yellow',
  overdue: 'badge-red', draft: 'badge-yellow', cancelled: 'badge-red',
  pending: 'badge-yellow',
};
