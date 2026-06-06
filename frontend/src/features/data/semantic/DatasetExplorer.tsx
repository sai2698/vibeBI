import React from 'react';
import { Database, Search, RefreshCcw, Columns, Hash, Calculator, Workflow, Code2 } from 'lucide-react';

interface Dataset {
  id: number; name: string; table_name: string | null;
  columns?: any[]; metrics?: any[]; calculated_columns?: any[];
  dataset_type?: string; custom_sql?: string | null;
}

interface Props {
  datasets: Dataset[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: (id: number) => void;
  isRefreshing: boolean;
  search: string;
  onSearchChange: (v: string) => void;
}

const getDatasetTypeIcon = (ds: Dataset) => {
  if (ds.dataset_type === 'flow') return <Workflow size={14} />;
  if (ds.custom_sql) return <Code2 size={14} />;
  return <Database size={14} />;
};

const getDatasetTypeBadge = (ds: Dataset): string => {
  if (ds.dataset_type === 'flow') return 'Flow';
  if (ds.custom_sql) return 'SQL';
  return 'Table';
};

const DatasetExplorer: React.FC<Props> = ({ datasets, selectedId, onSelect, onRefresh, isRefreshing, search, onSearchChange }) => {
  const filtered = (datasets ?? []).filter(d => d.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-colors">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Datasets</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{(datasets ?? []).length}</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text" placeholder="Search datasets..."
            value={search} onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Database size={32} className="text-slate-200 dark:text-slate-700 mb-3" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {search ? 'No datasets match your search' : 'No datasets available'}
            </p>
            {search && (
              <button onClick={() => onSearchChange('')} className="text-[10px] text-brand dark:text-brand-light font-bold mt-2 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          filtered.map(ds => (
            <button
              key={ds.id}
              onClick={() => onSelect(ds.id)}
              className={`w-full text-left p-3 rounded-xl transition-all group ${
                selectedId === ds.id
                  ? 'bg-brand/5 dark:bg-brand/10 border border-brand/20 dark:border-brand/30 shadow-sm'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${selectedId === ds.id ? 'bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                  {getDatasetTypeIcon(ds)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ds.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{ds.table_name || 'Custom SQL'}</div>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${
                  ds.dataset_type === 'flow' 
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                    : ds.custom_sql 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {getDatasetTypeBadge(ds)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 ml-8">
                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                  <Columns size={10} />{(ds.columns ?? []).length}
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 dark:text-emerald-400">
                  <Hash size={10} />{(ds.metrics ?? []).length}
                </span>
                {(ds.calculated_columns ?? []).length > 0 && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-blue-500 dark:text-blue-400">
                    <Calculator size={10} />{(ds.calculated_columns ?? []).length}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {selectedId && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onRefresh(selectedId)}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Schema'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DatasetExplorer;
