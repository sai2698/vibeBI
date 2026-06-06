import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
  requireTypeConfirm?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isLoading,
  requireTypeConfirm
}) => {
  const [confirmText, setConfirmText] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDeleteDisabled = isLoading || (requireTypeConfirm && confirmText.toLowerCase() !== 'delete');

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <AlertTriangle size={24} />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">
            {message} {itemName && <span className="font-bold text-slate-700">"{itemName}"</span>}
          </p>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-red-600 font-medium leading-relaxed">
              This action is permanent and cannot be undone. All associated data and configurations will be removed.
            </p>
          </div>

          {requireTypeConfirm && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Please type <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-mono select-all">delete</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type delete..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleteDisabled}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 transition-all transform active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete Forever
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmationModal;
