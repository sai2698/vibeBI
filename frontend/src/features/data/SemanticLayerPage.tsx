import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Layers, Columns, Hash, Eye, GitMerge, Database, AlertCircle, Calculator, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import DatasetExplorer from './semantic/DatasetExplorer';
import ColumnsTab from './semantic/ColumnsTab';
import MetricsTab from './semantic/MetricsTab';
import CalculatedColumnsTab from './semantic/CalculatedColumnsTab';
import DataPreviewTab from './semantic/DataPreviewTab';
import ColumnInspector from './semantic/ColumnInspector';
import RelationshipsTab from './semantic/RelationshipsTab';
import SemanticErrorBoundary from './semantic/ErrorBoundary';
import DataMartsManager from './datamarts/DataMartsManager';
import { useLOBStore } from '../../store/useLOBStore';

interface Dataset {
  id: number; name: string; datasource_id: number; table_name: string | null; description?: string;
  columns?: any[]; metrics?: any[]; calculated_columns?: any[];
}

/** Guarantees all array fields exist, preventing null-access crashes downstream */
const safeDataset = (ds: Dataset | undefined | null): Dataset | null => {
  if (!ds) return null;
  return {
    ...ds,
    columns: Array.isArray(ds.columns) ? ds.columns : [],
    metrics: Array.isArray(ds.metrics) ? ds.metrics : [],
    calculated_columns: Array.isArray(ds.calculated_columns) ? ds.calculated_columns : [],
  };
};

type TabKey = 'columns' | 'metrics' | 'calculated_columns' | 'relationships' | 'preview';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'columns', label: 'Columns', icon: <Columns size={14} /> },
  { key: 'metrics', label: 'Metrics', icon: <Hash size={14} /> },
  { key: 'calculated_columns', label: 'Calculated Columns', icon: <Calculator size={14} /> },
  { key: 'relationships', label: 'Relationships', icon: <GitMerge size={14} /> },
  { key: 'preview', label: 'Data Preview', icon: <Eye size={14} /> },
];

const SemanticLayerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('columns');
  const [selectedColumn, setSelectedColumn] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'datasets'|'datamarts'>('datasets');
  const [descExpanded, setDescExpanded] = useState(false);

  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  const { data: datasets = [] } = useQuery<Dataset[]>({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => { const r = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } }); return r.data; },
  });

  const { data: rawDataset, isLoading: isDatasetLoading, isError: isDatasetError, error: datasetError } = useQuery<Dataset>({
    queryKey: ['datasets', selectedDatasetId],
    queryFn: async () => { const r = await api.get(`/api/datasets/${selectedDatasetId}`); return r.data; },
    enabled: !!selectedDatasetId,
  });

  // Normalize dataset to guarantee arrays exist
  const dataset = safeDataset(rawDataset);

  useEffect(() => {
    if (!selectedDatasetId && datasets.length > 0) setSelectedDatasetId(datasets[0].id);
  }, [datasets, selectedDatasetId]);

  const refreshMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/datasets/${id}/refresh`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets'] }); toast.success('Schema refreshed'); },
    onError: () => toast.error('Refresh failed')
  });

  const updateDatasetMut = useMutation({
    mutationFn: (data: { id: number, description: string }) => api.patch(`/api/datasets/${data.id}`, { description: data.description }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['datasets'] }); toast.success('Dataset saved'); },
    onError: () => toast.error('Failed to save dataset')
  });

  const getTabCount = (key: TabKey): number | null => {
    if (!dataset) return null;
    switch (key) {
      case 'columns': return (dataset.columns ?? []).length;
      case 'metrics': return (dataset.metrics ?? []).length;
      case 'calculated_columns': return (dataset.calculated_columns ?? []).length;
      default: return null;
    }
  };

  const renderTabContent = () => {
    if (!selectedDatasetId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Layers size={28} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-semibold text-sm text-slate-500 dark:text-slate-400">Select a Dataset</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Choose a dataset from the left panel to start modeling</p>
        </div>
      );
    }

    if (isDatasetLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Loader2 size={28} className="animate-spin text-brand dark:text-brand-light" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Loading dataset...</p>
        </div>
      );
    }

    if (isDatasetError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="max-w-sm w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500 dark:text-red-400" />
            </div>
            <p className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">Failed to load dataset</p>
            <p className="text-xs text-red-600/70 dark:text-red-400/60 font-mono">
              {(datasetError as any)?.response?.data?.detail || (datasetError as any)?.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      );
    }

    if (!dataset) return null;

    switch (activeTab) {
      case 'columns':
        return (
          <SemanticErrorBoundary fallbackTitle="Columns tab crashed">
            <ColumnsTab
              datasetId={selectedDatasetId}
              columns={dataset.columns ?? []}
              onSelectColumn={setSelectedColumn}
              selectedColumnId={selectedColumn?.id || null}
            />
          </SemanticErrorBoundary>
        );
      case 'metrics':
        return (
          <SemanticErrorBoundary fallbackTitle="Metrics tab crashed">
            <MetricsTab datasetId={selectedDatasetId} metrics={dataset.metrics ?? []} />
          </SemanticErrorBoundary>
        );
      case 'calculated_columns':
        return (
          <SemanticErrorBoundary fallbackTitle="Calculated Columns tab crashed">
            <CalculatedColumnsTab datasetId={selectedDatasetId} columns={dataset.calculated_columns ?? []} />
          </SemanticErrorBoundary>
        );
      case 'preview':
        return (
          <SemanticErrorBoundary fallbackTitle="Data Preview tab crashed">
            <DataPreviewTab datasetId={selectedDatasetId} />
          </SemanticErrorBoundary>
        );
      case 'relationships':
        return (
          <SemanticErrorBoundary fallbackTitle="Relationships tab crashed">
            <RelationshipsTab datasetId={selectedDatasetId} datasets={datasets} />
          </SemanticErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden transition-colors">
      {/* Header */}
      <div className="shrink-0 h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-900 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-brand/10 dark:bg-brand/20 rounded-lg text-brand dark:text-brand-light"><Layers size={18} /></div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Semantic Layer</h1>
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Data Modeling Workbench</div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 ml-4">
            <button onClick={() => setViewMode('datasets')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'datasets' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Datasets</button>
            <button onClick={() => setViewMode('datamarts')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'datamarts' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Data Marts</button>
          </div>
        </div>
        {/* Dataset summary stats — only show when dataset is loaded */}
        {dataset && !isDatasetLoading && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Database size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dataset.name}</span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">({dataset.table_name || 'SQL'})</span>
            </div>
            <div className="flex gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Columns size={12} className="text-blue-500 dark:text-blue-400" />
                {(dataset.columns ?? []).length} cols
              </span>
              <span className="flex items-center gap-1">
                <Hash size={12} className="text-emerald-500 dark:text-emerald-400" />
                {(dataset.metrics ?? []).length} metrics
              </span>
              <span className="flex items-center gap-1">
                <Calculator size={12} className="text-violet-500 dark:text-violet-400" />
                {(dataset.calculated_columns ?? []).length} calc
              </span>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'datasets' ? (
      <div className="flex-1 flex min-h-0">
        {/* Left: Dataset Explorer */}
        <DatasetExplorer
          datasets={datasets}
          selectedId={selectedDatasetId}
          onSelect={id => { setSelectedDatasetId(id); setSelectedColumn(null); setActiveTab('columns'); setDescExpanded(false); }}
          onRefresh={id => refreshMut.mutate(id)}
          isRefreshing={refreshMut.isPending}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Center: Tabbed Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-900/30">
          {/* Collapsible description section */}
          {dataset && (
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="w-full px-6 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Description
                  {dataset.description && !descExpanded && (
                    <span className="ml-2 font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
                      — {dataset.description.slice(0, 80)}{(dataset.description?.length ?? 0) > 80 ? '...' : ''}
                    </span>
                  )}
                </span>
                {descExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
              {descExpanded && (
                <div className="px-6 pb-4">
                  <textarea 
                    key={dataset.id}
                    defaultValue={dataset.description || ''} 
                    placeholder="Add a description for this dataset..."
                    className="w-full text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none transition-colors" 
                    rows={2}
                    onBlur={(e) => {
                      if (e.target.value !== (dataset.description || '')) {
                        updateDatasetMut.mutate({ id: dataset.id, description: e.target.value });
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex gap-1">
            {TABS.map(t => {
              const count = getTabCount(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key); if (t.key !== 'columns') setSelectedColumn(null); }}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                    activeTab === t.key
                      ? 'text-brand border-brand dark:text-brand-light dark:border-brand-light'
                      : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {t.icon} {t.label}
                  {count !== null && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === t.key
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {renderTabContent()}
          </div>
        </div>

        {/* Right: Column Inspector */}
        {selectedColumn && activeTab === 'columns' && selectedDatasetId && (
          <ColumnInspector
            datasetId={selectedDatasetId}
            column={selectedColumn}
            onClose={() => setSelectedColumn(null)}
          />
        )}
      </div>
    ) : (
      <div className="flex-1 flex min-h-0">
        <DataMartsManager />
      </div>
    )}
    </div>
  );
};

export default SemanticLayerPage;
