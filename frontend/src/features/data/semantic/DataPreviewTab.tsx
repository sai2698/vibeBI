import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api';
import { Loader2, AlertCircle, Eye, RefreshCcw } from 'lucide-react';

interface Props { datasetId: number; }

const DataPreviewTab: React.FC<Props> = ({ datasetId }) => {
  const { data: preview, isLoading, error, refetch: refetchPreview } = useQuery({
    queryKey: ['dataset-preview', datasetId],
    queryFn: async () => { const r = await api.post(`/api/datasets/${datasetId}/preview`); return r.data; },
    staleTime: 60000
  });

  const { data: profile } = useQuery({
    queryKey: ['dataset-profile', datasetId],
    queryFn: async () => { const r = await api.post(`/api/datasets/${datasetId}/profile`); return r.data; },
    staleTime: 60000
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="animate-spin text-brand dark:text-brand-light" size={28} />
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Loading preview...</p>
      </div>
    );
  }

  if (error) {
    const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || 'Preview failed';
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-sm w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-500 dark:text-red-400" />
          </div>
          <p className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">Preview Failed</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/60 font-mono mb-4">{errorMsg}</p>
          <button onClick={() => refetchPreview()} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors">
            <RefreshCcw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const cols: string[] = Array.isArray(preview.columns) ? preview.columns : [];
  const rows: any[] = Array.isArray(preview.data) ? preview.data : [];
  const profileCols = profile?.columns ?? {};

  if (cols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Eye size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-xs text-slate-400 dark:text-slate-500">No columns returned in preview</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-brand dark:text-brand-light" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Preview</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{preview.row_count ?? rows.length} rows × {cols.length} columns</span>
        {profile && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Profiled from {profile.total_rows ?? '?'} rows</span>}
      </div>

      {/* Profile cards */}
      {profile && Object.keys(profileCols).length > 0 && (
        <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
          <div className="flex gap-3 min-w-max">
            {cols.slice(0, 12).map((col: string) => {
              const p = profileCols[col];
              if (!p) return null;
              return (
                <div key={col} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 min-w-[140px]">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate mb-1">{col}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                    <span className="text-slate-400 dark:text-slate-500">Distinct</span><span className="font-bold text-slate-600 dark:text-slate-300">{p.distinct_count ?? '—'}</span>
                    <span className="text-slate-400 dark:text-slate-500">Null %</span><span className="font-bold text-slate-600 dark:text-slate-300">{p.null_pct ?? '—'}%</span>
                    {p.min !== undefined && <><span className="text-slate-400 dark:text-slate-500">Min</span><span className="font-bold text-slate-600 dark:text-slate-300">{p.min}</span></>}
                    {p.max !== undefined && <><span className="text-slate-400 dark:text-slate-500">Max</span><span className="font-bold text-slate-600 dark:text-slate-300">{p.max}</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left min-w-max border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-300 dark:border-slate-800">
            <tr>
              <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 w-10">#</th>
              {cols.map((c: string) => (
                <th key={c} className="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row: any, i: number) => (
              <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'} hover:bg-brand/5 dark:hover:bg-brand/10`}>
                <td className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">{i + 1}</td>
                {cols.map((c: string) => (
                  <td key={c} className="px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate tabular-nums">
                    {row[c] === null || row[c] === undefined ? <span className="text-slate-300 dark:text-slate-600 italic">NULL</span> : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataPreviewTab;
