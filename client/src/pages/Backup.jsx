import { useRef, useState } from 'react';
import { backupAPI } from '../api/services';
import { downloadBlob } from '../utils';
import { MdCloudDownload, MdCloudUpload, MdCheckCircle, MdWarning, MdInfo, MdRestorePage } from 'react-icons/md';
import toast from 'react-hot-toast';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
  </div>
);

export default function Backup() {
  const fileRef = useRef();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);   // parsed backup file info
  const [fileData, setFileData] = useState(null); // raw parsed JSON
  const [restoreResult, setRestoreResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Export ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await backupAPI.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `vyapari-backup-${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Backup downloaded successfully');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally { setExporting(false); }
  };

  // ── File pick & parse ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed?.version || !parsed?.data) {
          toast.error('Invalid backup file. Please select a valid Vyapari backup.');
          return;
        }
        setFileData(parsed);
        setPreview({
          exportedAt: parsed.exportedAt,
          version: parsed.version,
          counts: parsed.counts || {},
        });
      } catch {
        toast.error('Could not read file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  // ── Restore ──
  const handleRestore = async () => {
    setConfirmOpen(false);
    setImporting(true);
    setRestoreResult(null);
    try {
      const { data } = await backupAPI.import(fileData);
      setRestoreResult({ success: true, ...data });
      toast.success('Data restored successfully!');
      setPreview(null);
      setFileData(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const msg = err.response?.data?.message || 'Restore failed. Please try again.';
      toast.error(msg);
      setRestoreResult({ success: false, message: msg });
    } finally { setImporting(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
        <p className="text-sm text-gray-500">Export your data or restore from a previous backup</p>
      </div>

      {/* ── Export Card ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <MdCloudDownload size={20} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Export Backup</h2>
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <MdInfo size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
            <p className="font-medium text-sm">What's included</p>
            {['Invoices & invoice items', 'Customers & suppliers', 'Products & categories', 'Purchases, expenses & payments', 'Stock adjustments'].map(item => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500">Downloads a complete JSON backup of all your business data. Store it safely.</p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary flex items-center gap-2">
          <MdCloudDownload size={18} />
          {exporting ? 'Preparing backup...' : 'Download Backup (JSON)'}
        </button>
      </div>

      {/* ── Import / Restore Card ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <MdRestorePage size={20} className="text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Restore from Backup</h2>
        </div>

        <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <MdWarning size={18} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-400">
            <span className="font-semibold">Warning:</span> Restoring will permanently replace all your current data with the backup. This cannot be undone. Export a fresh backup first.
          </p>
        </div>

        {/* File picker */}
        <div>
          <label className="label">Select Backup File (.json)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400 cursor-pointer"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Backup Preview</p>
            <InfoRow label="Exported At" value={new Date(preview.exportedAt).toLocaleString('en-IN')} />
            <InfoRow label="Version" value={preview.version} />
            {Object.entries(preview.counts).map(([key, val]) => (
              <InfoRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} />
            ))}
          </div>
        )}

        {/* Restore button */}
        {fileData && !restoreResult && (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={importing}
            className="btn-primary bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
          >
            <MdCloudUpload size={18} />
            {importing ? 'Restoring...' : 'Restore This Backup'}
          </button>
        )}

        {/* Restore result */}
        {restoreResult && (
          <div className={`p-4 rounded-lg space-y-2 ${restoreResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2">
              {restoreResult.success
                ? <MdCheckCircle size={18} className="text-green-600" />
                : <MdWarning size={18} className="text-red-500" />}
              <p className={`text-sm font-semibold ${restoreResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                {restoreResult.success ? 'Restore Successful' : restoreResult.message}
              </p>
            </div>
            {restoreResult.success && restoreResult.restored && (
              <div className="text-xs text-green-700 dark:text-green-400 space-y-0.5 pl-6">
                {Object.entries(restoreResult.restored).map(([key, val]) => (
                  <p key={key}>• {val} {key} restored</p>
                ))}
              </div>
            )}
            {restoreResult.warnings?.length > 0 && (
              <div className="text-xs text-orange-600 pl-6 space-y-0.5">
                <p className="font-medium">Warnings:</p>
                {restoreResult.warnings.map((w, i) => <p key={i}>• {w}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <MdWarning size={24} className="text-orange-500 shrink-0" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirm Restore</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will <span className="font-semibold text-red-500">permanently delete</span> all current data and replace it with the backup. Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleRestore} className="btn-primary bg-red-500 hover:bg-red-600 text-sm">Yes, Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
