import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { Calculator, Plus, Trash2, Edit3, Code, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import CalculatedColumnFormModal from './CalculatedColumnFormModal';

interface CalculatedColumn { 
  id: number; 
  name: string; 
  expression: string; 
  friendly_name: string | null; 
  description: string | null;
  data_type: string | null;
}

interface Props { 
  datasetId: number; 
  columns: CalculatedColumn[]; 
}

const CalculatedColumnsTab: React.FC<Props> = ({ datasetId, columns }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editExpr, setEditExpr] = useState('');

  const deleteMut = useMutation({
    mutationFn: (colId: number) => api.delete(`/api/datasets/${datasetId}/columns/${colId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] }); toast.success('Calculated column deleted'); },
    onError: () => toast.error('Failed to delete')
  });

  const updateMut = useMutation({
    mutationFn: ({ colId, data }: { colId: number; data: any }) => api.patch(`/api/datasets/${datasetId}/columns/${colId}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] }); setEditId(null); toast.success('Calculated column updated'); },
    onError: () => toast.error('Failed to update')
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-blue-500 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Calculated Columns</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{columns.length}</span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition shadow-lg shadow-brand/10">
          <Plus size={14} /> Add Calculated Column
        </button>
      </div>

      {columns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-16">
          <Calculator size={48} className="mb-4 opacity-20" />
          <p className="font-medium mb-1">No Calculated Columns Defined</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Create custom calculated columns using SQL expressions</p>
          <button onClick={() => setIsModalOpen(true)} className="text-brand dark:text-brand-light text-xs font-bold hover:underline">+ Add your first calculated column</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {columns.map(col => (
            <div key={col.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-md dark:hover:shadow-black/20 hover:border-brand/20 dark:hover:border-brand/40 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Calculator size={16} /></div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{col.friendly_name || col.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{col.name}</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditId(col.id); setEditExpr(col.expression); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-brand transition"><Edit3 size={14} /></button>
                  <button onClick={() => { if (confirm('Delete this calculated column?')) deleteMut.mutate(col.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 transition"><Trash2 size={14} /></button>
                </div>
              </div>
              {editId === col.id ? (
                <div className="space-y-2">
                  <textarea value={editExpr} onChange={e => setEditExpr(e.target.value)} rows={2} className="w-full text-xs font-mono px-3 py-2 bg-slate-900 text-blue-400 rounded-lg border-none outline-none focus:ring-2 focus:ring-brand dark:bg-black" />
                  <div className="flex gap-2">
                    <button onClick={() => updateMut.mutate({ colId: col.id, data: { expression: editExpr } })} className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-bold hover:bg-blue-600 transition"><Check size={12} />Save</button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"><X size={12} />Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <Code size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <code className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">{col.expression}</code>
                </div>
              )}
              {col.description && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{col.description}</p>}
            </div>
          ))}
        </div>
      )}
      <CalculatedColumnFormModal isOpen={isModalOpen} datasetId={datasetId} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default CalculatedColumnsTab;
