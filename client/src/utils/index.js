export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0);

export const formatDate = (date) =>
  date ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)) : '-';

export const calcGSTAmounts = (amount, gstRate, isInterState = false) => {
  const tax = (amount * gstRate) / 100;
  return isInterState
    ? { cgst: 0, sgst: 0, igst: tax, total: tax }
    : { cgst: tax / 2, sgst: tax / 2, igst: 0, total: tax };
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const getMonthName = (month) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
