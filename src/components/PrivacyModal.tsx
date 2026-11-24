import { useState } from 'react';
import { ShieldAlert, Trash2, X } from 'lucide-react';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmDeleteAllData: () => Promise<void>;
}

export function PrivacyModal({
  open,
  onClose,
  onConfirmDeleteAllData,
}: PrivacyModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleDelete = async () => {
    setConfirming(true);
    try {
      await onConfirmDeleteAllData();
      setStatusMessage('All session logs, SRS cards, and progress data have been permanently cleared.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="privacy-modal-title" className="font-display text-lg font-semibold text-white">
            Account &amp; Data Safety
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            Voice recordings in Shadowing mode are processed ephemerally in your browser and are never retained on external servers.
          </p>
          <p>
            YouTube clips stream directly through the official YouTube IFrame Player API in compliance with YouTube Terms of Service.
          </p>
        </div>

        {statusMessage && (
          <div className="bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 rounded-lg p-3 text-xs">
            {statusMessage}
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Permanent reset</span>
          </div>
          <button
            type="button"
            disabled={confirming}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirming ? 'Deleting...' : 'Delete All Learning Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
