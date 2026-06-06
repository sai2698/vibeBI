import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { Hash, Plus, Trash2, Edit3, Code, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import MetricFormModal from '../MetricFormModal';

interface Metric { id: number; name: string; expression: string; friendly_name: string | null; description: string | null; }
interface Props { datasetId: number; metrics: Metric[]; }

const MetricsTab: React.FC<Props> = ({ datasetId, metrics }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editExpr, setEditExpr] = useState('');

  const deleteMut = useMutation({
    mutationFn: (metricId: number) => api.delete(`/api/datasets/${datasetId}/metrics/${metricId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] }); toast.success('Metric deleted'); },
    onError: () => toast.error('Failed to delete')
  });

  const updateMut = useMutation({
    mutationFn: ({ metricId, data }: { metricId: number; data: any }) => api.patch(`/api/datasets/${datasetId}/metrics/${metricId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] }); setEditId(null); toast.success('Metric updated'); },
    onError: () => toast.error('Failed to update')
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-emerald-500 dark:text-emerald-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Business Metrics</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{metrics.length}</span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition shadow-lg shadow-brand/10">
          <Plus size={14} /> Add Metric
        </button>
      </div>

      {metrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-16">
          <Hash size={48} className="mb-4 opacity-20" />
          <p className="font-medium mb-1">No Metrics Defined</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Create custom business metrics using SQL aggregation expressions</p>
          <button onClick={() => setIsModalOpen(true)} className="text-brand dark:text-brand-light text-xs font-bold hover:underline">+ Add your first metric</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map(m => (
            <div key={m.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md dark:hover:shadow-black/20 hover:border-brand/20 dark:hover:border-brand/40 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><Hash size={16} /></div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{m.friendly_name || m.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{m.name}</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(m.id); setEditExpr(m.expression); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-brand transition"><Edit3 size={14} /></button>
                  <button onClick={() => { if (confirm('Delete this metric?')) deleteMut.mutate(m.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 transition"><Trash2 size={14} /></button>
                </div>
              </div>
              {editId === m.id ? (
                <div className="space-y-2">
                  <textarea value={editExpr} onChange={e => setEditExpr(e.target.value)} rows={2} className="w-full text-xs font-mono px-3 py-2 bg-slate-900 text-emerald-400 rounded-lg border-none outline-none focus:ring-2 focus:ring-brand dark:bg-black" />
                  <div className="flex gap-2">
                    <button onClick={() => updateMut.mutate({ metricId: m.id, data: { expression: editExpr } })} className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold hover:bg-emerald-600 transition"><Check size={12} />Save</button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"><X size={12} />Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <Code size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <code className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">{m.expression}</code>
                </div>
              )}
              {m.description && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{m.description}</p>}
            </div>
          ))}
        </div>
      )}
      <MetricFormModal isOpen={isModalOpen} datasetId={datasetId} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default MetricsTab;
