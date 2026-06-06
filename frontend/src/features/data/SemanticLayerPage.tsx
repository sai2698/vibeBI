import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Layers, Columns, Hash, Eye, GitMerge, Database, AlertCircle, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import DatasetExplorer from './semantic/DatasetExplorer';
import ColumnsTab from './semantic/ColumnsTab';
import MetricsTab from './semantic/MetricsTab';
import CalculatedColumnsTab from './semantic/CalculatedColumnsTab';
import DataPreviewTab from './semantic/DataPreviewTab';
import ColumnInspector from './semantic/ColumnInspector';
import RelationshipsTab from './semantic/RelationshipsTab';
import DataMartsManager from './datamarts/DataMartsManager';
import { useLOBStore } from '../../store/useLOBStore';

interface Dataset {
  id: number; name: string; datasource_id: number; table_name: string | null; description?: string;
  columns: any[]; metrics: any[]; calculated_columns?: any[];
}

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

  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  const { data: datasets = [] } = useQuery<Dataset[]>({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => { const r = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } }); return r.data; },
  });

  const { data: dataset, isError: isDatasetError, error: datasetError } = useQuery<Dataset>({
    queryKey: ['datasets', selectedDatasetId],
    queryFn: async () => { const r = await api.get(`/api/datasets/${selectedDatasetId}`); return r.data; },
    enabled: !!selectedDatasetId,
  });

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
        {dataset && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Database size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dataset.name}</span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">({dataset.table_name || 'SQL'})</span>
            </div>
            <div className="flex gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {!dataset.columns ? (
                <span className="text-red-500">Error: Columns missing</span>
              ) : (
                <span><Columns size={12} className="inline mr-1" />{dataset.columns?.length || 0} cols</span>
              )}
              {!dataset.metrics ? (
                <span className="text-red-500">Error: Metrics missing</span>
              ) : (
                <span><Hash size={12} className="inline mr-1" />{dataset.metrics?.length || 0} metrics</span>
              )}
              {!dataset.calculated_columns ? (
                <span className="text-slate-400">+ {dataset.calculated_columns?.length || 0} calc cols</span>
              ) : (
                <span><Calculator size={12} className="inline mr-1" />{dataset.calculated_columns?.length || 0} calc cols</span>
              )}
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
          onSelect={id => { setSelectedDatasetId(id); setSelectedColumn(null); setActiveTab('columns'); }}
          onRefresh={id => refreshMut.mutate(id)}
          isRefreshing={refreshMut.isPending}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Center: Tabbed Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-900/30">
          {/* Dataset Meta Info */}
          {dataset && (
            <div className="shrink-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
               <textarea 
                  key={dataset.id}
                  defaultValue={dataset.description || ''} 
                  placeholder="Add a description for this dataset..."
                  className="w-full text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none" 
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== (dataset.description || '')) {
                      updateDatasetMut.mutate({ id: dataset.id, description: e.target.value });
                    }
                  }}
               />
            </div>
          )}

          {/* Tabs */}
          <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex gap-1">
            {TABS.map(t => (
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
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {!selectedDatasetId ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                <Layers size={64} className="opacity-10 mb-4" />
                <p className="font-medium">Select a Dataset</p>
                <p className="text-xs">Choose a dataset from the left panel to start modeling</p>
              </div>
            ) : isDatasetError ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p className="font-medium text-lg">Failed to load dataset details</p>
                <p className="text-sm opacity-80 mt-1">{(datasetError as any)?.response?.data?.detail || (datasetError as any)?.message || 'An unexpected error occurred'}</p>
              </div>
            ) : (!dataset?.columns || !dataset?.metrics) ? (
              <div className="flex flex-col items-center justify-center h-full text-amber-600">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p className="font-medium text-lg">Incomplete Dataset Data</p>
                <p className="text-sm opacity-80 mt-1">The server returned a dataset without columns or metrics arrays. Please refresh or check backend logs.</p>
              </div>
            ) : activeTab === 'columns' && dataset ? (
              <ColumnsTab
                datasetId={selectedDatasetId}
                columns={dataset.columns || []}
                onSelectColumn={setSelectedColumn}
                selectedColumnId={selectedColumn?.id || null}
              />
            ) : activeTab === 'metrics' && dataset ? (
              <MetricsTab datasetId={selectedDatasetId} metrics={dataset.metrics || []} />            ) : activeTab === 'calculated_columns' && dataset ? (
              <CalculatedColumnsTab datasetId={selectedDatasetId} columns={dataset.calculated_columns || []} />            ) : activeTab === 'preview' ? (
              <DataPreviewTab datasetId={selectedDatasetId} />
            ) : activeTab === 'relationships' && dataset ? (
              <RelationshipsTab datasetId={selectedDatasetId} datasets={datasets} />
            ) : null}
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
