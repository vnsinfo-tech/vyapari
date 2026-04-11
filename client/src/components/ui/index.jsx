// KPI Card
export function KPICard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
  };
  return (
    <div className="card flex items-center gap-3 min-w-0">
      <div className={`p-2.5 rounded-xl shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

// Spinner
export function Spinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex justify-center items-center p-8">
      <div className={`${s[size]} animate-spin rounded-full border-2 border-primary-600 border-t-transparent`} />
    </div>
  );
}

// Empty State
export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">📭</span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Badge
export function Badge({ status }) {
  const map = {
    paid: 'badge-green', sent: 'badge-blue', partial: 'badge-yellow',
    overdue: 'badge-red', draft: 'badge-yellow', cancelled: 'badge-red',
    pending: 'badge-yellow', active: 'badge-green', inactive: 'badge-red',
  };
  return <span className={map[status] || 'badge-blue'}>{status}</span>;
}

// Confirm Dialog
export function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger text-sm">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// Modal
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${sizes[size]} my-4 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Pagination
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">Prev</button>
      <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pages}</span>
      <button disabled={page === pages} onClick={() => onPage(page + 1)} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">Next</button>
    </div>
  );
}

