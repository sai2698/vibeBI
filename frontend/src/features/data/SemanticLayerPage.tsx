import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Layers, Columns, Hash, Eye, GitMerge, Database, AlertCircle, Calculator, Loader2, FileText } from 'lucide-react';
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

const safeDataset = (ds: Dataset | undefined | null): Dataset | null => {
  if (!ds) return null;
  return {
    ...ds,
    columns: Array.isArray(ds.columns) ? ds.columns : [],
    metrics: Array.isArray(ds.metrics) ? ds.metrics : [],
    calculated_columns: Array.isArray(ds.calculated_columns) ? ds.calculated_columns : [],
  };
};

type TabKey = 'description' | 'columns' | 'metrics' | 'calculated_columns' | 'relationships' | 'preview';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'description', label: 'Description', icon: <FileText size={14} /> },
  { key: 'columns', label: 'Columns', icon: <Columns size={14} /> },
  { key: 'metrics', label: 'Metrics', icon: <Hash size={14} /> },
  { key: 'calculated_columns', label: 'Calculated Columns', icon: <Calculator size={14} /> },
  { key: 'relationships', label: 'Relationships', icon: <GitMerge size={14} /> },
  { key: 'preview', label: 'Data Preview', icon: <Eye size={14} /> },
];

const SemanticLayerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('description');
  const [selectedColumn, setSelectedColumn] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'datasets'|'datamarts'>('datasets');
  const [descValue, setDescValue] = useState('');

  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  const { data: datasets = [] } = useQuery<Dataset[]>({
    queryKey: ['datasets', 'list', activeLOB?.id],
    queryFn: async () => { const r = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } }); return r.data; },
  });

  const { data: datasources = [] } = useQuery<any[]>({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get('/api/datasources/')).data,
  });

  const { data: rawDataset, isLoading: isDatasetLoading, isError: isDatasetError, error: datasetError } = useQuery<Dataset>({
    queryKey: ['datasets', 'detail', selectedDatasetId],
    queryFn: async () => { const r = await api.get(`/api/datasets/${selectedDatasetId}`); return r.data; },
    enabled: !!selectedDatasetId,
  });

  const dataset = safeDataset(rawDataset);

  useEffect(() => {
    if (!selectedDatasetId && datasets.length > 0) setSelectedDatasetId(datasets[0].id);
  }, [datasets, selectedDatasetId]);

  useEffect(() => {
    if (dataset) {
      setDescValue(dataset.description || '');
    }
  }, [dataset?.id, dataset?.description]);

  const refreshMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/datasets/${id}/refresh`),
    onSuccess: (_, id) => { 
      queryClient.invalidateQueries({ queryKey: ['datasets'] }); 
      queryClient.invalidateQueries({ queryKey: ['datasets', 'detail', id] });
      toast.success('Schema refreshed'); 
    },
    onError: () => toast.error('Refresh failed')
  });

  const updateDatasetMut = useMutation({
    mutationFn: (data: { id: number, description: string }) => api.patch(`/api/datasets/${data.id}`, { description: data.description }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['datasets'] }); 
      queryClient.invalidateQueries({ queryKey: ['datasets', 'detail', selectedDatasetId] });
      toast.success('Dataset saved'); 
    },
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

  const handleSaveDescription = () => {
    if (dataset && descValue !== (dataset.description || '')) {
      updateDatasetMut.mutate({ id: dataset.id, description: descValue });
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
      case 'description':
        return (
          <SemanticErrorBoundary fallbackTitle="Description tab crashed">
            <div className="p-6 max-w-2xl space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Description</h3>
                <textarea 
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  placeholder="Enter dataset business description..."
                  className="w-full text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none transition-colors" 
                  rows={5}
                  onBlur={handleSaveDescription}
                />
                {descValue !== (dataset.description || '') && (
                  <div className="flex items-center gap-2 justify-end pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {updateDatasetMut.isPending && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
                        <Loader2 size={11} className="animate-spin" /> Saving...
                      </span>
                    )}
                    <button
                      type="button"
                      onMouseDown={() => setDescValue(dataset.description || '')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDescription}
                      disabled={updateDatasetMut.isPending}
                      className="px-4 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition shadow shadow-brand/10 disabled:opacity-50"
                    >
                      Save Description
                    </button>
                  </div>
                )}
              </div>

              {/* Technical Details Grid */}
              <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-850/25">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-150 dark:border-slate-850">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Technical Details</h4>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-450 dark:text-slate-500 block mb-0.5">Dataset ID</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{dataset.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-500 block mb-0.5">Physical Table / View</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{dataset.table_name || 'Custom SQL Query'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-500 block mb-0.5">Dataset Type</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{dataset.table_name ? 'Table' : 'Custom SQL'}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 dark:text-slate-500 block mb-0.5">Columns Count</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{dataset.columns?.length ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </SemanticErrorBoundary>
        );
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

  const isRefreshing = refreshMut.isPending;
  const refreshingId = isRefreshing ? (refreshMut.variables as number) : null;

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
        
        {/* Dataset summary stats */}
        {dataset && !isDatasetLoading && (
          <div className="flex items-center gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Database size={14} className="text-slate-400 dark:text-slate-505" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dataset.name}</span>
              <span className="text-[9px] font-mono text-slate-450 dark:text-slate-500">({dataset.table_name || 'SQL'})</span>
            </div>
            <div className="flex gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Columns size={12} className="text-blue-500 dark:text-blue-455" />
                {(dataset.columns ?? []).length} cols
              </span>
              <span className="flex items-center gap-1">
                <Hash size={12} className="text-emerald-500 dark:text-emerald-455" />
                {(dataset.metrics ?? []).length} metrics
              </span>
              <span className="flex items-center gap-1">
                <Calculator size={12} className="text-violet-500 dark:text-violet-455" />
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
          datasources={datasources}
          selectedId={selectedDatasetId}
          onSelect={id => { setSelectedDatasetId(id); setSelectedColumn(null); setActiveTab('description'); }}
          onRefresh={id => refreshMut.mutate(id)}
          refreshingId={refreshingId}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Center: Tabbed Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-900/30">
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
                      : 'text-slate-400 dark:text-slate-505 border-transparent hover:text-slate-650 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
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
