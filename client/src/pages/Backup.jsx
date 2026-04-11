import { useState } from 'react';
import { backupAPI } from '../api/services';
import { downloadBlob } from '../utils';
import { MdCloudDownload, MdInfo } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Backup() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data } = await backupAPI.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `vyapari-backup-${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Backup downloaded successfully');
    } catch {
      toast.error('Backup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Backup & Export</h1>
        <p className="text-sm text-gray-500">Download a complete backup of your business data</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <MdInfo size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400">
            <p className="font-medium">What's included in the backup?</p>
            <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside">
              <li>All invoices and invoice items</li>
              <li>Customers and suppliers</li>
              <li>Products and inventory</li>
              <li>Purchases and expenses</li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Export Data</h2>
          <p className="text-sm text-gray-500 mb-3">Downloads a JSON file with all your business data. Store it safely as a backup.</p>
          <button onClick={handleExport} disabled={loading} className="btn-primary flex items-center gap-2">
            <MdCloudDownload size={18} />
            {loading ? 'Preparing backup...' : 'Download Backup (JSON)'}
          </button>
        </div>
      </div>

      <div className="card space-y-3 opacity-60">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Import / Restore</h2>
        <p className="text-sm text-gray-500">Restore from a previous backup file.</p>
        <div className="flex items-center gap-3">
          <input type="file" accept=".json" disabled className="text-sm text-gray-400" />
          <button disabled className="btn-secondary text-sm">Restore (Coming Soon)</button>
        </div>
      </div>
    </div>
  );
}
