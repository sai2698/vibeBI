import React, { useState, useMemo } from 'react';
import { 
  Database, Search, RefreshCcw, Columns, Hash, Calculator, 
  Workflow, Code2, ChevronRight, ChevronDown, Folder, FolderOpen, Server, FileText 
} from 'lucide-react';

interface Dataset {
  id: number; name: string; datasource_id: number; table_name: string | null;
  columns?: any[]; metrics?: any[]; calculated_columns?: any[];
  dataset_type?: string; custom_sql?: string | null;
}

interface Datasource {
  id: number;
  name: string;
  engine: string;
}

interface Props {
  datasets: Dataset[];
  datasources: Datasource[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: (id: number) => void;
  refreshingId: number | null;
  search: string;
  onSearchChange: (v: string) => void;
}

const getDatasetTypeIcon = (ds: Dataset) => {
  if (ds.dataset_type === 'flow') return <Workflow size={12} className="text-violet-500/80" />;
  if (ds.custom_sql) return <Code2 size={12} className="text-amber-500/80" />;
  return <FileText size={12} className="text-blue-500/80" />;
};

const DatasetExplorer: React.FC<Props> = ({ 
  datasets = [], 
  datasources = [], 
  selectedId, 
  onSelect, 
  onRefresh, 
  refreshingId, 
  search, 
  onSearchChange 
}) => {
  const [selectedDatasourceFilter, setSelectedDatasourceFilter] = useState<string>('all');
  const [collapsedFolders, setCollapsedFolders] = useState<{ [key: string]: boolean }>({});

  const toggleFolder = (folderKey: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  // Group datasets by datasource_id
  const grouped = useMemo(() => {
    const filteredDatasets = (datasets ?? []).filter(ds => 
      ds.name?.toLowerCase().includes(search.toLowerCase()) || 
      (ds.table_name ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const groups: { [key: string]: Dataset[] } = {};
    filteredDatasets.forEach(ds => {
      const key = ds.datasource_id ? String(ds.datasource_id) : 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(ds);
    });

    return groups;
  }, [datasets, search]);

  // Merge with datasource details
  const datasourceItems = useMemo(() => {
    const items = (datasources ?? []).map(ds => {
      const dsDatasets = grouped[String(ds.id)] ?? [];
      return {
        id: ds.id,
        name: ds.name,
        engine: ds.engine,
        datasets: dsDatasets,
        isOther: false,
      };
    });

    const otherDatasets = grouped['other'] ?? [];
    if (otherDatasets.length > 0) {
      items.push({
        id: 0,
        name: 'Other / Local Datasets',
        engine: 'local',
        datasets: otherDatasets,
        isOther: true,
      });
    }

    return items.filter(item => item.datasets.length > 0);
  }, [datasources, grouped]);

  // Filter visible datasource folders based on selected dropdown filter
  const visibleDatasources = useMemo(() => {
    if (selectedDatasourceFilter === 'all') {
      return datasourceItems;
    }
    return datasourceItems.filter(item => String(item.id) === selectedDatasourceFilter);
  }, [datasourceItems, selectedDatasourceFilter]);

  const totalFilteredCount = useMemo(() => {
    return visibleDatasources.reduce((acc, curr) => acc + curr.datasets.length, 0);
  }, [visibleDatasources]);

  return (
    <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-colors select-none">
      {/* Top Header Controls */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Explorer</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {totalFilteredCount}
          </span>
        </div>

        {/* Datasource Dropdown */}
        <div className="relative">
          <select
            value={selectedDatasourceFilter}
            onChange={e => setSelectedDatasourceFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer appearance-none pr-8 font-semibold"
          >
            <option value="all">All Datasources</option>
            {(datasources ?? []).map(ds => (
              <option key={ds.id} value={String(ds.id)}>{ds.name} ({ds.engine.toUpperCase()})</option>
            ))}
            {grouped['other']?.length > 0 && (
              <option value="0">Other / Local Datasets</option>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
            <ChevronDown size={12} />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text" placeholder="Filter datasets..."
            value={search} onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-650"
          />
        </div>
      </div>

      {/* Tree Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
        {visibleDatasources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Database size={32} className="text-slate-200 dark:text-slate-750 mb-3" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {search ? 'No matches found' : 'No datasets configured'}
            </p>
            {search && (
              <button onClick={() => onSearchChange('')} className="text-[10px] text-brand dark:text-brand-light font-bold mt-2 hover:underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          visibleDatasources.map(folder => {
            const folderKey = `folder-${folder.id}`;
            const isCollapsed = collapsedFolders[folderKey] || false;

            return (
              <div key={folder.id} className="space-y-0.5">
                {/* Folder Header */}
                <button
                  onClick={() => toggleFolder(folderKey)}
                  className="w-full flex items-center gap-2 py-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded text-left transition-colors group/folder"
                >
                  <div className="text-slate-400 group-hover/folder:text-slate-600 dark:group-hover/folder:text-slate-300 transition-colors">
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500">
                    <Server size={12} />
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {folder.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 shrink-0">
                      ({folder.datasets.length})
                    </span>
                  </div>
                </button>

                {/* Folder Children */}
                {!isCollapsed && (
                  <div className="pl-3 ml-3 border-l border-slate-100 dark:border-slate-800 space-y-0.5 pt-0.5 pb-0.5">
                    {folder.datasets.map(ds => {
                      const isSelected = selectedId === ds.id;
                      const isRefreshing = refreshingId === ds.id;

                      return (
                        <div
                          key={ds.id}
                          onClick={() => onSelect(ds.id)}
                          className={`group/dataset flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-brand/5 dark:bg-brand/10 text-brand dark:text-brand-light font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="shrink-0">
                              {getDatasetTypeIcon(ds)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs truncate leading-tight">{ds.name}</div>
                            </div>
                          </div>

                          {/* Action Items */}
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            {/* Refresh Button */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onRefresh(ds.id);
                              }}
                              title="Refresh Schema"
                              disabled={isRefreshing}
                              className={`p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-450 dark:text-slate-550 hover:text-brand dark:hover:text-brand-light transition-opacity ${
                                isRefreshing 
                                  ? 'opacity-100' 
                                  : 'opacity-0 group-hover/dataset:opacity-100'
                              }`}
                            >
                              <RefreshCcw size={11} className={isRefreshing ? 'animate-spin text-brand' : ''} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DatasetExplorer;
