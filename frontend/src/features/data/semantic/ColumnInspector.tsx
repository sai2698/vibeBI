import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { X, Save, Type, Hash, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Column {
  id: number; column_name: string; friendly_name: string | null;
  data_type: string | null; is_filterable: boolean; is_groupable: boolean; is_visible: boolean;
  description: string | null; expression: string | null; format_string: string | null;
}

interface Props { datasetId: number; column: Column; onClose: () => void; }

const ColumnInspector: React.FC<Props> = ({ datasetId, column, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({
    friendly_name: column.friendly_name || '',
    description: column.description || '',
    format_string: column.format_string || '',
    expression: column.expression || '',
    is_filterable: column.is_filterable,
    is_groupable: column.is_groupable,
    is_visible: column.is_visible,
  });

  React.useEffect(() => {
    setForm({
      friendly_name: column.friendly_name || '',
      description: column.description || '',
      format_string: column.format_string || '',
      expression: column.expression || '',
      is_filterable: column.is_filterable,
      is_groupable: column.is_groupable,
      is_visible: column.is_visible,
    });
  }, [column.id]);

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/api/datasets/${datasetId}/columns/${column.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets', 'detail', datasetId] }); toast.success('Column saved'); },
    onError: () => toast.error('Save failed')
  });

  const TypeIcon = () => {
    const dt = column.data_type || '';
    if (dt.includes('int') || dt.includes('float')) return <Hash size={16} className="text-emerald-500" />;
    if (dt.includes('date') || dt.includes('time')) return <Calendar size={16} className="text-amber-500" />;
    return <Type size={16} className="text-blue-500" />;
  };

  return (
    <div className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-colors">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Column Inspector</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 transition-colors"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Identity */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Identity</div>
          <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 mb-1">{column.column_name}</div>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{column.data_type || 'unknown'}</span>
        </div>

        {/* Flags */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 space-y-3">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Behavior</div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="font-medium">Filterable</span>
            <button onClick={() => setForm(f => ({ ...f, is_filterable: !f.is_filterable }))} className="transition-colors">
              {form.is_filterable ? <ToggleRight size={22} className="text-brand" /> : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="font-medium">Groupable</span>
            <button onClick={() => setForm(f => ({ ...f, is_groupable: !f.is_groupable }))} className="transition-colors">
              {form.is_groupable ? <ToggleRight size={22} className="text-brand" /> : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="font-medium">Visible</span>
            <button onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))} className="transition-colors">
              {form.is_visible ? <ToggleRight size={22} className="text-brand" /> : <ToggleLeft size={22} className="text-slate-300 dark:text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-3">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Metadata</div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Friendly Name</label>
            <input value={form.friendly_name} onChange={e => setForm(f => ({ ...f, friendly_name: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none transition-colors" placeholder="Business context for this column..." />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Format String</label>
            <input value={form.format_string} onChange={e => setForm(f => ({ ...f, format_string: e.target.value }))} placeholder="e.g. $#,##0.00"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Expression (Calculated)</label>
            <textarea value={form.expression} onChange={e => setForm(f => ({ ...f, expression: e.target.value }))} rows={2} placeholder="UPPER(first_name) || ' ' || last_name"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-900 dark:bg-black text-emerald-400 border-none rounded-lg outline-none focus:ring-2 focus:ring-brand resize-none" />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => updateMut.mutate(form)}
          disabled={updateMut.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition shadow-lg shadow-brand/10 disabled:opacity-50"
        >
          <Save size={14} /> {updateMut.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ColumnInspector;
