import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { Hash, Plus, Trash2, Edit3, Code, X, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import MetricFormModal from '../MetricFormModal';

interface Metric { id: number; name: string; expression: string; friendly_name: string | null; description: string | null; }
interface Props { datasetId: number; metrics: Metric[]; }

const MetricsTab: React.FC<Props> = ({ datasetId, metrics }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editExpr, setEditExpr] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return safeMetrics;
    const term = searchTerm.toLowerCase();
    return safeMetrics.filter(m =>
      (m.name?.toLowerCase() ?? '').includes(term) ||
      (m.friendly_name?.toLowerCase() ?? '').includes(term) ||
      (m.expression?.toLowerCase() ?? '').includes(term) ||
      (m.description?.toLowerCase() ?? '').includes(term)
    );
  }, [safeMetrics, searchTerm]);

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
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{safeMetrics.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {safeMetrics.length > 0 && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
              <input
                type="text" placeholder="Search metrics..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600 w-48"
              />
            </div>
          )}
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition shadow-lg shadow-brand/10">
            <Plus size={14} /> Add Metric
          </button>
        </div>
      </div>

      {safeMetrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Hash size={28} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-semibold text-sm text-slate-500 dark:text-slate-400 mb-1">No Metrics Defined</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-xs text-center">Create custom business metrics using SQL aggregation expressions</p>
          <button onClick={() => setIsModalOpen(true)} className="text-brand dark:text-brand-light text-xs font-bold hover:underline">+ Add your first metric</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <p className="text-xs text-slate-400 dark:text-slate-500">No metrics match "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="text-[10px] text-brand dark:text-brand-light font-bold mt-2 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m => (
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
                  <textarea value={editExpr} onChange={e => setEditExpr(e.target.value)} rows={2} className="w-full text-xs font-mono px-3 py-2 bg-slate-900 dark:bg-black text-emerald-400 rounded-lg border-none outline-none focus:ring-2 focus:ring-brand" />
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
