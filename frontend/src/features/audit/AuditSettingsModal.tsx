import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import toast from 'react-hot-toast';
import { Settings, X, Save, AlertCircle } from 'lucide-react';

interface AuditSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuditSettingsModal: React.FC<AuditSettingsModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['audit-settings'],
    queryFn: async () => {
      const res = await api.get('/api/audit-logs/settings');
      return res.data;
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.audit_logging_enabled ?? true);
      setRetentionDays(settings.audit_log_retention_days ?? 30);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/audit-logs/settings', {
        audit_logging_enabled: enabled,
        audit_log_retention_days: retentionDays
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-settings'] });
      toast.success('Audit settings updated successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update settings');
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161622] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Audit Settings</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Manage enterprise logging configurations</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8 text-brand">
              <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Toggle Logging */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Enable Audit Logging</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When disabled, the system will stop recording new events to the audit trail. Existing logs are preserved based on the retention policy.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand"></div>
                </label>
              </div>

              {/* Retention Policy */}
              <div className="space-y-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <label className="text-sm font-bold text-slate-900 dark:text-white block">Log Retention Period (Days)</label>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Logs older than this number of days will be automatically purged by the nightly cleanup job to save database storage.
                </p>
                <div className="relative">
                  <input 
                    type="number"
                    min={1}
                    max={3650}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value) || 1)}
                    className="w-full bg-white dark:bg-[#0a0a0f] border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-wider">Days</span>
                </div>
                {retentionDays < 7 && (
                  <div className="flex items-start gap-2 mt-3 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-500/20">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium leading-tight">Short retention periods may affect compliance auditing capabilities.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || isLoading}
            className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand/90 hover:-translate-y-0.5 shadow-md shadow-brand/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {updateMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditSettingsModal;
