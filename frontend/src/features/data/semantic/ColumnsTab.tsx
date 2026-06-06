import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { Type, Hash, Calendar, Check, X, Filter, GitBranch, ChevronDown, ChevronUp, ArrowUpDown, ToggleLeft, ToggleRight, Edit3, Search, Columns } from 'lucide-react';
import toast from 'react-hot-toast';

interface Column {
  id: number; column_name: string; friendly_name: string | null;
  data_type: string | null; is_filterable: boolean; is_groupable: boolean; is_visible: boolean;
  description: string | null; expression: string | null; format_string: string | null;
}

interface Props {
  datasetId: number;
  columns: Column[];
  onSelectColumn: (col: Column) => void;
  selectedColumnId: number | null;
}

const TypeIcon = ({ dtype }: { dtype: string | null }) => {
  if (!dtype) return <Type size={14} className="text-slate-400" />;
  if (dtype.includes('int') || dtype.includes('float') || dtype.includes('numeric')) return <Hash size={14} className="text-emerald-500" />;
  if (dtype.includes('date') || dtype.includes('time')) return <Calendar size={14} className="text-amber-500" />;
  if (dtype.includes('bool')) return <ToggleLeft size={14} className="text-indigo-500" />;
  return <Type size={14} className="text-blue-500" />;
};

const typeBadge = (dtype: string | null) => {
  if (!dtype) return 'unknown';
  if (dtype.includes('int')) return 'INT';
  if (dtype.includes('float')) return 'FLOAT';
  if (dtype.includes('date') || dtype.includes('time')) return 'DATE';
  if (dtype.includes('bool')) return 'BOOL';
  if (dtype.includes('object') || dtype.includes('str') || dtype.includes('text') || dtype.includes('varchar')) return 'TEXT';
  return dtype.toUpperCase().slice(0, 6);
};

type TypeFilter = 'all' | 'text' | 'number' | 'date' | 'bool';

const getTypeCategory = (dtype: string | null): TypeFilter => {
  if (!dtype) return 'text';
  if (dtype.includes('int') || dtype.includes('float') || dtype.includes('numeric')) return 'number';
  if (dtype.includes('date') || dtype.includes('time')) return 'date';
  if (dtype.includes('bool')) return 'bool';
  return 'text';
};

const TYPE_FILTERS: { key: TypeFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' },
  { key: 'text', label: 'Text', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  { key: 'number', label: 'Number', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'date', label: 'Date', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  { key: 'bool', label: 'Bool', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' },
];

const ColumnsTab: React.FC<Props> = ({ datasetId, columns, onSelectColumn, selectedColumnId }) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortKey, setSortKey] = useState<string>('column_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const safeColumns = Array.isArray(columns) ? columns : [];

  const updateMut = useMutation({
    mutationFn: ({ colId, data }: { colId: number; data: any }) =>
      api.patch(`/api/datasets/${datasetId}/columns/${colId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] });
      toast.success('Column updated');
    },
    onError: () => toast.error('Failed to update column')
  });

  const startEdit = (col: Column) => {
    setEditingId(col.id);
    setEditValue(col.friendly_name || col.column_name);
  };

  const saveEdit = (colId: number) => {
    updateMut.mutate({ colId, data: { friendly_name: editValue } });
    setEditingId(null);
  };

  const toggleFlag = (col: Column, flag: 'is_filterable' | 'is_groupable' | 'is_visible') => {
    updateMut.mutate({ colId: col.id, data: { [flag]: !col[flag] } });
  };

  const filtered = useMemo(() => {
    let result = safeColumns;
    
    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(c => getTypeCategory(c.data_type) === typeFilter);
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        (c.column_name?.toLowerCase() ?? '').includes(term) ||
        (c.friendly_name?.toLowerCase() ?? '').includes(term) ||
        (c.description?.toLowerCase() ?? '').includes(term)
      );
    }
    
    return result;
  }, [safeColumns, typeFilter, searchTerm]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = (a as any)[sortKey] ?? '';
      const vb = (b as any)[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortBtn = ({ col, label }: { col: string; label: string }) => (
    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
      {label}
      {sortKey === col ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={10} className="opacity-30" />}
    </button>
  );

  if (safeColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Columns size={28} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="font-semibold text-sm text-slate-500 dark:text-slate-400 mb-1">No Columns Discovered</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs text-center">
          This dataset has no columns. Try refreshing the schema or check if the datasource is accessible.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search & filter bar */}
      <div className="shrink-0 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search columns..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                typeFilter === f.key
                  ? `${f.color} ring-1 ring-current/20`
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-auto">
          {sorted.length} of {safeColumns.length}
        </span>
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm border-b-2 border-slate-200 dark:border-slate-800">
            <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3"><SortBtn col="column_name" label="Column" /></th>
              <th className="px-4 py-3"><SortBtn col="friendly_name" label="Friendly Name" /></th>
              <th className="px-4 py-3"><SortBtn col="description" label="Description" /></th>
              <th className="px-4 py-3 w-20 text-center"><SortBtn col="data_type" label="Type" /></th>
              <th className="px-4 py-3 w-20 text-center"><Filter size={12} className="inline mr-1" />Filter</th>
              <th className="px-4 py-3 w-20 text-center"><GitBranch size={12} className="inline mr-1" />Group</th>
              <th className="px-4 py-3 w-20 text-center"><ToggleLeft size={12} className="inline mr-1" />Visible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No columns match your filter criteria
                </td>
              </tr>
            ) : (
              sorted.map(col => (
                <tr
                  key={col.id}
                  onClick={() => onSelectColumn(col)}
                  className={`group cursor-pointer transition-colors ${selectedColumnId === col.id ? 'bg-brand/5 dark:bg-brand/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <td className="px-4 py-2.5"><TypeIcon dtype={col.data_type} /></td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{col.column_name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {editingId === col.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          value={editValue} onChange={e => setEditValue(e.target.value)}
                          className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-brand rounded w-full text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand outline-none"
                          autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(col.id)}
                        />
                        <button onClick={() => saveEdit(col.id)} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/edit">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{col.friendly_name || <span className="text-slate-300 dark:text-slate-700 italic">—</span>}</span>
                        <button onClick={e => { e.stopPropagation(); startEdit(col); }} className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-slate-400 dark:text-slate-500 hover:text-brand transition"><Edit3 size={12} /></button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate block" title={col.description || ''}>
                      {col.description || <span className="text-slate-300 dark:text-slate-700 italic">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{typeBadge(col.data_type)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleFlag(col, 'is_filterable')} className="transition-colors">
                      {col.is_filterable ? <ToggleRight size={20} className="text-brand" /> : <ToggleLeft size={20} className="text-slate-300 dark:text-slate-700" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleFlag(col, 'is_groupable')} className="transition-colors">
                      {col.is_groupable ? <ToggleRight size={20} className="text-brand" /> : <ToggleLeft size={20} className="text-slate-300 dark:text-slate-700" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleFlag(col, 'is_visible')} className="transition-colors">
                      {col.is_visible ? <ToggleRight size={20} className="text-brand" /> : <ToggleLeft size={20} className="text-slate-300 dark:text-slate-700" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ColumnsTab;
