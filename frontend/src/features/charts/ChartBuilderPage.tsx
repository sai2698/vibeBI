import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';
import { useLOBStore } from '../../store/useLOBStore';
import EChartWrapper from '../../components/charts/EChartWrapper';
import type { ChartType } from '../../components/charts/EChartWrapper';
import { transformChartData } from '../../utils/chartUtils';
import SingleSelect from '../../components/ui/SingleSelect';
import {
  BarChart3, LineChart, PieChart,
  Database, Type, Hash, Play, Save, X, Palette,
  Activity, Layout, Edit3, Filter, Trash2, Plus,
  Box, Share2, GitBranch, Grid, Disc, Columns,
  GitPullRequest, Gauge, AlignLeft, Calendar,
  Layers, Table as TableIcon, LayoutGrid, Loader2, Folder, FileCode2, SaveAll, Settings2
} from 'lucide-react';
import SaveAssetModal from './components/SaveAssetModal';
import DynamicChartControls from './components/DynamicChartControls';
import { useDrillDown } from '../../components/charts/useDrillDown';

const PALETTES = {
  modern: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'],
  corporate: ['#0F172A', '#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'],
  vibrant: ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6'],
  nature: ['#065F46', '#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
};

interface Dataset {
  id: number;
  name: string;
  columns: Array<{ id: number; column_name: string; friendly_name: string; data_type: string }>;
  metrics: Array<{ id: number; name: string; friendly_name: string; expression: string }>;
}

const chartTypes: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'line', label: 'Line', icon: <LineChart size={18} /> },
  { type: 'bar', label: 'Bar', icon: <BarChart3 size={18} /> },
  { type: 'pie', label: 'Pie', icon: <PieChart size={18} /> },
  { type: 'scatter', label: 'Scatter', icon: <Activity size={18} /> },
  { type: 'heatmap', label: 'Heatmap', icon: <Layout size={18} /> },
  { type: 'boxplot', label: 'Boxplot', icon: <Box size={18} /> },
  { type: 'graph', label: 'Graph', icon: <Share2 size={18} /> },
  { type: 'tree', label: 'Tree', icon: <GitBranch size={18} /> },
  { type: 'treemap', label: 'Treemap', icon: <Grid size={18} /> },
  { type: 'sunburst', label: 'Sunburst', icon: <Disc size={18} /> },
  { type: 'parallel', label: 'Parallel', icon: <Columns size={18} /> },
  { type: 'sankey', label: 'Sankey', icon: <GitPullRequest size={18} /> },
  { type: 'funnel', label: 'Funnel', icon: <Filter size={18} /> },
  { type: 'gauge', label: 'Gauge', icon: <Gauge size={18} /> },
  { type: 'pictorialBar', label: 'PictorialBar', icon: <AlignLeft size={18} /> },
  { type: 'themeRiver', label: 'ThemeRiver', icon: <Activity size={18} /> },
  { type: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  { type: 'chord', label: 'Chord', icon: <Disc size={18} /> },
  { type: 'kpi', label: 'KPI Tile', icon: <Hash size={18} /> },
  { type: 'table', label: 'Data Table', icon: <TableIcon size={18} /> },
  { type: 'pivot', label: 'Pivot Table', icon: <LayoutGrid size={18} /> },
];

const CHART_REQUIREMENTS: Record<string, { minDim: number; maxDim?: number; minMet: number; msg: string }> = {
  kpi: { minDim: 0, maxDim: 0, minMet: 1, msg: 'KPI needs 1 measure' },
  table: { minDim: 1, minMet: 0, msg: 'Table needs 1+ dimensions or measures' },
  pivot: { minDim: 1, minMet: 1, msg: 'Pivot needs 1+ dimensions & 1 measure' },
  bar: { minDim: 1, minMet: 1, msg: 'Bar needs 1 dimension & 1+ measures' },
  line: { minDim: 1, minMet: 1, msg: 'Line needs 1 dimension & 1+ measures' },
  pie: { minDim: 1, maxDim: 1, minMet: 1, msg: 'Pie needs 1 dimension & 1 measure' },
  scatter: { minDim: 0, minMet: 2, msg: 'Scatter needs 2+ measures' },
  heatmap: { minDim: 2, maxDim: 2, minMet: 1, msg: 'Heatmap needs 2 dimensions & 1 measure' },
  treemap: { minDim: 1, minMet: 1, msg: 'Treemap needs 1 dimension & 1 measure' },
  sunburst: { minDim: 1, minMet: 1, msg: 'Sunburst needs 1 dimension & 1 measure' },
  funnel: { minDim: 1, maxDim: 1, minMet: 1, msg: 'Funnel needs 1 dimension & 1 measure' },
  gauge: { minDim: 0, maxDim: 0, minMet: 1, msg: 'Gauge needs 1 measure' },
  boxplot: { minDim: 1, minMet: 1, msg: 'Boxplot needs 1 dimension & 1 measure' },
  sankey: { minDim: 2, minMet: 1, msg: 'Sankey needs 2 dimensions & 1 measure' },
};

const LoadingAnimation = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="loading-container">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="loading-bar"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Processing Data...</p>
  </div>
);

const ChartBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = window.location;
  const searchParams = new URLSearchParams(location.search);
  const initialDatasetId = searchParams.get('dataset_id');
  const initialFolderId = searchParams.get('folderId');
  const queryClient = useQueryClient();
  const { activeLOB } = useLOBStore();

  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(initialDatasetId ? Number(initialDatasetId) : null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [chartTitle, setChartTitle] = useState('Untitled Chart');
  const [folderId, setFolderId] = useState<number | null>(initialFolderId ? Number(initialFolderId) : null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [dimensions, setDimensions] = useState<{ name: string; alias: string }[]>([]);
  const [pivotColumns, setPivotColumns] = useState<{ name: string; alias: string }[]>([]);
  const [metrics, setMetrics] = useState<{ name: string; column?: string; agg?: string; alias: string }[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<keyof typeof PALETTES>('modern');
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [visualConfig, setVisualConfig] = useState<Record<string, any>>({});

  // Drill-down state for the preview (so the user can test drill in the builder)
  const builderDrill = useDrillDown();

  // Layout states
  const [sidebarW, setSidebarW] = useState(340);
  const [dragging, setDragging] = useState<'h' | null>(null);

  const startHResize = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging('h');
      const x0 = e.clientX;
      const w0 = sidebarW;
      const move = (ev: MouseEvent) => setSidebarW(Math.max(240, Math.min(600, w0 + ev.clientX - x0)));
      const up = () => { setDragging(null); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [sidebarW],
  );

  // Fetch chart for editing
  const { data: chartToEdit, isLoading: isChartLoading } = useQuery({
    queryKey: ['charts', id],
    queryFn: async () => {
      const response = await api.get(`/api/charts/${id}`);
      return response.data;
    },
    enabled: !!id && id !== 'builder',
  });

  const { data: allCharts } = useQuery<any[]>({
    queryKey: ['charts', 'custom_template'],
    queryFn: async () => {
      const response = await api.get('/api/charts/', { params: { chart_type: 'custom_template' } });
      return response.data;
    }
  });

  const { data: chartFolders } = useQuery<any[]>({
    queryKey: ['chart_folders', activeLOB?.id],
    queryFn: async () => {
      const response = await api.get('/api/chart-folders/', { params: { lob_id: activeLOB?.id } });
      return response.data;
    },
    enabled: !!activeLOB
  });

  // Populate state when editing
  useEffect(() => {
    if (chartToEdit) {
      setChartTitle(chartToEdit.title || 'Untitled Chart');
      setFolderId(chartToEdit.folder_id || null);
      setChartType(chartToEdit.chart_type as ChartType || 'bar');
      setSelectedDatasetId(chartToEdit.dataset_id || null);

      const rawDims = chartToEdit.query_config?.dimensions || [];
      setDimensions(rawDims.map((d: any) => typeof d === 'string' ? { name: d, alias: d } : d));

      const rawPivotCols = chartToEdit.query_config?.pivotColumns || [];
      setPivotColumns(rawPivotCols.map((d: any) => typeof d === 'string' ? { name: d, alias: d } : d));

      const rawMets = chartToEdit.query_config?.metrics || [];
      setMetrics(rawMets.map((m: any) => typeof m === 'string' ? { name: m, alias: m } : m));

      setVisualConfig(chartToEdit.visual_config || {});
    }
  }, [chartToEdit]);

  // Fetch datasets
  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => {
      const response = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } });
      return response.data;
    },
  });

  // Fetch selected dataset details
  const { data: dataset } = useQuery<Dataset>({
    queryKey: ['datasets', selectedDatasetId],
    queryFn: async () => {
      const response = await api.get(`/api/datasets/${selectedDatasetId}`);
      return response.data;
    },
    enabled: !!selectedDatasetId,
  });

  // Preview data mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const filterDict: Record<string, any> = {};
      activeFilters.forEach(f => {
        if (f.column && f.value) filterDict[f.column] = f.value;
      });

      const response = await api.post('/api/charts/preview', {
        dataset_id: selectedDatasetId,
        query_config: {
          dimensions,
          pivotColumns,
          metrics,
          limit: 1000
        },
        filters: filterDict
      });
      return response.data;
    },
  });

  // Transform preview data for ECharts
  const chartData = useMemo(() => {
    const res = previewMutation.data;
    if (!res || !res.data) return { series: [] };
    return transformChartData(res.data, chartType, dimensions, metrics, pivotColumns);
  }, [previewMutation.data, dimensions, metrics, chartType]);

  const handleRunQuery = () => {
    if (selectedDatasetId && (dimensions.length > 0 || metrics.length > 0)) {
      previewMutation.mutate();
    }
  };

  const toggleDimension = (col: string) => {
    setDimensions(prev => {
      const exists = prev.find(d => d.name === col);
      if (exists) return prev.filter(d => d.name !== col);
      return [...prev, { name: col, alias: col }];
    });
    // Remove from other shelf if exists
    setPivotColumns(prev => prev.filter(d => d.name !== col));
  };

  const togglePivotColumn = (col: string) => {
    setPivotColumns(prev => {
      const exists = prev.find(d => d.name === col);
      if (exists) return prev.filter(d => d.name !== col);
      return [...prev, { name: col, alias: col }];
    });
    // Remove from other shelf if exists
    setDimensions(prev => prev.filter(d => d.name !== col));
  };

  const toggleMetric = (met: any) => {
    const metName = typeof met === 'string' ? met : met.name;
    setMetrics(prev => {
      const exists = prev.some(m => m.name === metName);
      if (exists) {
        return prev.filter(m => m.name !== metName);
      } else {
        const newMet = typeof met === 'string'
          ? { name: met, alias: met }
          : { ...met, alias: met.alias || met.name };
        return [...prev, newMet];
      }
    });
  };

  const [adhocCol, setAdhocCol] = useState('');
  const [adhocAgg, setAdhocAgg] = useState('sum');

  const addAdhocMetric = () => {
    if (!adhocCol) return;
    const name = `${adhocAgg}_${adhocCol}`;
    toggleMetric({ column: adhocCol, agg: adhocAgg, name });
    setAdhocCol('');
  };

  const saveMutation = useMutation({
    mutationFn: (chartData: any) => {
      if (id && id !== 'builder') {
        return api.patch(`/api/charts/${id}`, chartData);
      }
      return api.post('/api/charts/', chartData);
    },
    onSuccess: () => {
      toast.success(id ? 'Chart updated successfully!' : 'Chart saved successfully!');
      if (!id) navigate('/charts');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to save chart';
      toast.error(msg);
    }
  });

  const refreshSchemaMutation = useMutation({
    mutationFn: () => api.post(`/api/datasets/${selectedDatasetId}/refresh`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets', selectedDatasetId] });
      toast.success('Schema metadata refreshed from source!');
    },
    onError: (error: any) => {
      toast.error('Schema refresh failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  });


  const handleSave = () => {
    if (!activeLOB) {
      toast.error('Please select or create a Line of Business (LOB) first.');
      return;
    }
    if (!selectedDatasetId) return;
    setIsSaveModalOpen(true);
  };

  const confirmSave = (newTitle: string, newFolderId: number | null) => {
    if (!selectedDatasetId) return;
    
    // Convert activeFilters to a filter dictionary for default_filters
    const defaultFilters: Record<string, any> = {};
    activeFilters.forEach(f => {
      if (f.column && f.value) {
        defaultFilters[f.column] = f.value;
      }
    });
    
    saveMutation.mutate({
      title: newTitle,
      chart_type: chartType,
      dataset_id: selectedDatasetId,
      folder_id: newFolderId,
      query_config: { 
        dimensions, 
        pivotColumns, 
        metrics, 
        limit: 100000,
        default_filters: Object.keys(defaultFilters).length > 0 ? defaultFilters : undefined
      },
      visual_config: { ...visualConfig, code: visualConfig.code, colorPalette: PALETTES[selectedPalette] },
      lob_id: activeLOB?.id
    });
    setChartTitle(newTitle);
    setFolderId(newFolderId);
    setIsSaveModalOpen(false);
  };

  const checkRequirements = () => {
    const req = CHART_REQUIREMENTS[chartType];
    if (!req) return { met: true };

    const dimCount = dimensions.length + pivotColumns.length;
    const metCount = metrics.length;

    if (dimCount < req.minDim) return { met: false, msg: req.msg };
    if (req.maxDim !== undefined && dimCount > req.maxDim) return { met: false, msg: req.msg };
    if (metCount < req.minMet) return { met: false, msg: req.msg };

    return { met: true };
  };

  if (isChartLoading && id) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-brand" size={48} />
      </div>
    );
  }

  const reqStatus = checkRequirements();

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500" style={{ userSelect: dragging ? 'none' : 'auto' }}>
      {/* Top Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand/10 dark:bg-brand/20 text-brand">
              <PieChart size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center group/title relative">
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  placeholder="Untitled Chart"
                  className="text-lg font-bold bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-brand dark:focus:border-brand transition-all w-48 focus:w-64 px-1 py-0.5 -ml-1 h-7"
                />
                <Edit3 size={14} className="absolute right-2 text-slate-400 dark:text-slate-500 opacity-0 group-hover/title:opacity-100 pointer-events-none transition-all" />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Visual Designer</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          {/* Dataset Selector */}
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Source Dataset</span>
             <div className="relative group min-w-[240px]">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none">
                 <Database size={14} />
               </div>
               <SingleSelect
                 value={selectedDatasetId?.toString() || ''}
                 onChange={(val) => setSelectedDatasetId(Number(val))}
                 placeholder="Select Dataset..."
                 options={datasets?.map(ds => ({ label: ds.name, value: ds.id.toString() })) || []}
                 buttonClassName="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-9 pr-3 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all"
               />
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunQuery}
            disabled={previewMutation.isPending || !selectedDatasetId || !reqStatus.met}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {previewMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} 
            Update Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !selectedDatasetId}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-all disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            Save Asset
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden bg-white dark:bg-slate-900 transition-colors">

        {/* Leftmost Sidebar: Chart Types */}
        <div className="shrink-0 w-44 bg-slate-50 dark:bg-[#0f1115] border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#1a1b1e]">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Standard Charts</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar content-start bg-white dark:bg-[#0f1115]">
            {chartTypes.map(ct => (
              <button
                key={ct.type}
                onClick={() => setChartType(ct.type)}
                className={`w-full flex flex-col items-center justify-center p-3 rounded-lg transition-all border ${chartType === ct.type
                    ? 'bg-brand/5 dark:bg-brand/10 border-brand text-brand shadow-sm'
                    : 'bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand/40 hover:text-brand dark:hover:text-brand-light'
                  }`}
                title={ct.label}
              >
                {ct.icon}
                <span className="text-[10px] font-semibold mt-2 truncate w-full text-center">{ct.label}</span>
              </button>
            ))}
          </div>
          <div className="p-3 border-b border-t border-slate-200 dark:border-slate-800 bg-[#f8f9fa] dark:bg-[#1a1b1e]">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Custom Code</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar content-start bg-white dark:bg-[#0f1115]">
            <button
              onClick={() => navigate('/charts/playground')}
              className="w-full flex flex-col items-center justify-center p-3 rounded-lg transition-all border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1e1e1e] hover:text-brand group"
              title="Create New Custom Chart"
            >
              <Plus size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-semibold mt-2 text-center">New Asset</span>
            </button>

            {allCharts?.filter(c => c.chart_type === 'custom_template' && (!activeLOB || c.lob_id === activeLOB.id)).map(chart => (
              <button
                key={chart.id}
                onClick={() => {
                  setChartType('custom');
                  setVisualConfig(prev => ({ ...prev, code: chart.visual_config?.code }));
                  toast.success(`Applied template: ${chart.title}`);
                }}
                className={`w-full flex flex-col items-center justify-center p-3 rounded-lg transition-all border group relative ${chartType === 'custom' && visualConfig.code === chart.visual_config?.code
                    ? 'bg-brand/5 dark:bg-brand/10 border-brand text-brand shadow-sm'
                    : 'bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand/40 hover:text-brand'
                  }`}
                title={chart.title}
              >
                <FileCode2 size={18} className={chartType === 'custom' && visualConfig.code === chart.visual_config?.code ? 'text-brand' : 'text-slate-400'} />
                <span className="text-[10px] font-semibold mt-2 truncate w-full text-center leading-tight">{chart.title}</span>
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full opacity-50" />

                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/charts/playground?id=${chart.id}`);
                  }}
                  className="absolute bottom-1 right-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm opacity-0 group-hover:opacity-100 hover:text-brand transition-all cursor-pointer z-10"
                >
                  <Edit3 size={10} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Left Sidebar: Data Selection */}
        <div className="shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 overflow-hidden" style={{ width: sidebarW }}>
          {/* Data Selection */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {(dimensions.length > 0 || metrics.length > 0) && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setDimensions([]); setMetrics([]); }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-tighter transition-colors"
                >
                  Clear Fields
                </button>
              </div>
            )}

            {/* Dimensions Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                  <Type size={12} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Dimensions</span>
                  {selectedDatasetId && (
                    <button
                      onClick={() => refreshSchemaMutation.mutate()}
                      disabled={refreshSchemaMutation.isPending}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-brand transition-colors"
                      title="Refresh Column Metadata"
                    >
                      <Activity size={12} className={refreshSchemaMutation.isPending ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {dataset?.columns.map(col => {
                  const isRowActive = dimensions.some(d => d.name === col.column_name);
                  const isColActive = pivotColumns.some(d => d.name === col.column_name);
                  const isPivotMode = chartType === 'pivot' || chartType === 'heatmap';

                  return (
                    <div key={col.id} className="flex flex-col gap-1 p-1 hover:bg-white dark:hover:bg-[#1e1e1e] rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group">
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{col.friendly_name || col.column_name}</span>
                        {!isPivotMode && (
                          <button
                            onClick={() => toggleDimension(col.column_name)}
                            className={`p-1 rounded-md transition-colors ${isRowActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                          >
                            {isRowActive ? <X size={12} /> : <Plus size={12} />}
                          </button>
                        )}
                      </div>

                      {isPivotMode && (
                        <div className="flex gap-1 px-1 pb-1">
                          <button
                            onClick={() => toggleDimension(col.column_name)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition-all ${isRowActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600'
                              }`}
                          >
                            {isRowActive ? <X size={10} /> : <Plus size={10} />} Row
                          </button>
                          <button
                            onClick={() => togglePivotColumn(col.column_name)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold transition-all ${isColActive ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-brand/10 hover:text-brand'
                              }`}
                          >
                            {isColActive ? <X size={10} /> : <Plus size={10} />} Col
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!dataset && <div className="text-[11px] font-medium text-slate-400 italic px-2">Select a dataset above</div>}
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3 mt-4">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20">
                  <Hash size={12} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Measures</span>
              </div>
              <div className="space-y-1 mb-4">
                {dataset?.metrics.map(met => {
                  const isActive = metrics.some(m => m.name === met.name);
                  return (
                    <button
                      key={met.id}
                      onClick={() => toggleMetric(met.name)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all group ${isActive
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1e1e1e] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
                        }`}
                    >
                      <span className="truncate">{met.friendly_name || met.name}</span>
                      {isActive ? <X size={12} /> : <Plus size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Ad-hoc Metric */}
              {dataset && (
                <div className="p-3 bg-white dark:bg-[#1e1e1e] rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm group hover:border-brand/30 transition-all">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Calculation</p>
                  
                  <SingleSelect
                    value={adhocCol}
                    onChange={setAdhocCol}
                    placeholder="Select Column..."
                    options={dataset?.columns.map(c => ({ label: c.friendly_name || c.column_name, value: c.column_name })) || []}
                    buttonClassName="bg-slate-50 dark:bg-[#0f1115] border-slate-200 dark:border-slate-700 rounded py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  />

                  <div className="flex gap-2">
                    <SingleSelect
                      value={adhocAgg}
                      onChange={setAdhocAgg}
                      placeholder="Agg"
                      className="flex-1 min-w-0"
                      options={[
                        { label: 'Sum', value: 'sum' },
                        { label: 'Avg', value: 'avg' },
                        { label: 'Count', value: 'count' },
                        { label: 'Count Distinct', value: 'distinct_count' },
                        { label: 'Min', value: 'min' },
                        { label: 'Max', value: 'max' }
                      ]}
                      buttonClassName="bg-slate-50 dark:bg-[#0f1115] border-slate-200 dark:border-slate-700 rounded py-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    />
                    
                    <button
                      onClick={addAdhocMetric}
                      disabled={!adhocCol}
                      className="px-3 bg-brand text-white rounded text-[11px] font-bold uppercase tracking-widest hover:bg-brand-dark disabled:opacity-50 transition-all shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div>
              <div className="flex items-center gap-2 mb-3 mt-4">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-amber-50 dark:bg-amber-900/20">
                  <Filter size={12} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Filters</span>
              </div>
              <div className="space-y-2">
                {activeFilters.map((f, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-[#1e1e1e] rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col gap-2 shadow-sm transition-all hover:border-amber-200/50">
                    <div className="flex items-center justify-between gap-2">
                      <SingleSelect
                        value={f.column}
                        onChange={val => {
                          const nf = [...activeFilters];
                          nf[i].column = val;
                          setActiveFilters(nf);
                        }}
                        placeholder="Column"
                        className="flex-1 min-w-0"
                        options={dataset?.columns.map(c => ({ label: c.friendly_name || c.column_name, value: c.column_name })) || []}
                        buttonClassName="!bg-transparent !border-none !shadow-none !p-1 !text-[11px] font-semibold text-slate-700 dark:text-slate-300 outline-none hover:bg-slate-50 dark:hover:bg-[#0f1115] rounded -ml-1"
                      />
                      <button onClick={() => setActiveFilters(activeFilters.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      value={f.value}
                      onChange={e => {
                        const nf = [...activeFilters];
                        nf[i].value = e.target.value;
                        setActiveFilters(nf);
                      }}
                      className="w-full text-[11px] font-semibold bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand outline-none placeholder:font-normal"
                      placeholder="Value..."
                    />
                  </div>
                ))}
                <button
                  onClick={() => setActiveFilters([...activeFilters, { column: dataset?.columns[0]?.column_name, op: '=', value: '' }])}
                  disabled={!dataset}
                  className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-500 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add Filter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── H-Resize handle ── */}
        <div
          onMouseDown={startHResize}
          className={`shrink-0 w-1 -ml-1 z-10 cursor-col-resize transition-colors ${dragging === 'h' ? 'bg-brand' : 'hover:bg-brand/50 bg-transparent'}`}
        />

        {/* Center: Shelves & Canvas */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-100/50 dark:bg-slate-900/50">

          {/* Shelves (Tableau Style) */}
          <div className="shrink-0 bg-white dark:bg-[#0f1115] border-b border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-3">
            {/* Row Dimensions / Standard Dimensions */}
            <div className="flex items-center gap-4">
              <span className="w-16 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {chartType === 'pivot' || chartType === 'heatmap' ? 'Rows' : 'Columns'}
              </span>
              <div className="flex-1 min-h-[40px] bg-slate-50/80 dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 rounded-md flex flex-wrap items-center gap-2 p-1.5 shadow-inner">
                {dimensions.map((dim, idx) => (
                  <div key={dim.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#2d2f34] border border-blue-500/30 text-blue-700 dark:text-blue-400 rounded text-[11px] font-semibold shadow-sm group">
                    <Type size={12} className="opacity-70" />
                    <input
                      value={dim.alias}
                      onChange={e => {
                        const newDims = [...dimensions];
                        newDims[idx].alias = e.target.value;
                        setDimensions(newDims);
                      }}
                      className="bg-transparent border-none focus:ring-0 p-0 text-[11px] font-semibold w-fit min-w-[30px] outline-none text-slate-800 dark:text-slate-200"
                    />
                    <button onClick={() => toggleDimension(dim.name)} className="opacity-50 hover:opacity-100 hover:text-red-500 transition-colors ml-1"><X size={14} /></button>
                  </div>
                ))}
                {dimensions.length === 0 && <span className="text-[11px] font-medium text-slate-400 italic px-2">Drop dimensions here</span>}
              </div>
            </div>

            {/* Column Dimensions (Pivot only) */}
            {(chartType === 'pivot' || chartType === 'heatmap') && (
              <div className="flex items-center gap-4">
                <span className="w-16 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Columns</span>
                <div className="flex-1 min-h-[40px] bg-slate-50/80 dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 rounded-md flex flex-wrap items-center gap-2 p-1.5 shadow-inner">
                  {pivotColumns.map((dim, idx) => (
                    <div key={dim.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#2d2f34] border border-brand/30 text-brand rounded text-[11px] font-semibold shadow-sm group">
                      <Type size={12} className="opacity-70" />
                      <input
                        value={dim.alias}
                        onChange={e => {
                          const newCols = [...pivotColumns];
                          newCols[idx].alias = e.target.value;
                          setPivotColumns(newCols);
                        }}
                        className="bg-transparent border-none focus:ring-0 p-0 text-[11px] font-semibold w-fit min-w-[30px] outline-none text-slate-800 dark:text-slate-200"
                      />
                      <button onClick={() => togglePivotColumn(dim.name)} className="opacity-50 hover:opacity-100 hover:text-red-500 transition-colors ml-1"><X size={14} /></button>
                    </div>
                  ))}
                  {pivotColumns.length === 0 && <span className="text-[11px] font-medium text-slate-400 italic px-2">Drop column dimensions here</span>}
                </div>
              </div>
            )}

            {/* Measures / Values */}
            <div className="flex items-center gap-4">
              <span className="w-16 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {chartType === 'pivot' || chartType === 'heatmap' ? 'Measures' : 'Rows'}
              </span>
              <div className="flex-1 min-h-[40px] bg-slate-50/80 dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 rounded-md flex flex-wrap items-center gap-2 p-1.5 shadow-inner">
                {metrics.map((met, idx) => (
                  <div key={met.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#2d2f34] border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded text-[11px] font-semibold shadow-sm group">
                    <Hash size={12} className="opacity-70" />
                    <input
                      value={met.alias}
                      onChange={e => {
                        const newMets = [...metrics];
                        newMets[idx].alias = e.target.value;
                        setMetrics(newMets);
                      }}
                      className="bg-transparent border-none focus:ring-0 p-0 text-[11px] font-semibold w-fit min-w-[30px] outline-none text-slate-800 dark:text-slate-200"
                    />
                    <button onClick={() => toggleMetric(met)} className="opacity-50 hover:opacity-100 hover:text-red-500 transition-colors ml-1"><X size={14} /></button>
                  </div>
                ))}
                {metrics.length === 0 && <span className="text-[11px] font-medium text-slate-400 italic px-2">Drop measures here</span>}
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col min-h-0 relative m-4 bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-colors">
            {previewMutation.isPending && (
              <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                <LoadingAnimation />
              </div>
            )}

            {!reqStatus.met && selectedDatasetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                  <Filter size={32} className="text-amber-500" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">Configuration Required</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs text-center">{reqStatus.msg}</p>
              </div>
            ) : selectedDatasetId && (dimensions.length > 0 || metrics.length > 0) ? (
              <div className="flex-1 flex flex-col p-6">
                <EChartWrapper
                  chartType={chartType}
                  data={chartData}
                  title={chartTitle}
                  height="100%"
                  visualConfig={{ ...visualConfig, colorPalette: PALETTES[selectedPalette] }}
                  drillStack={builderDrill.drillStack}
                  availableColumns={dataset?.columns?.map((c: any) => c.column_name) || []}
                  currentDimensionName={dimensions[0]?.alias || dimensions[0]?.name || ''}
                  onDrillDown={builderDrill.drillDown}
                  onDrillUp={builderDrill.drillUp}
                  onDrillToLevel={builderDrill.drillToLevel}
                  onResetDrill={builderDrill.resetDrill}
                  onFilterByValue={builderDrill.filterByValue}
                  onExcludeValue={builderDrill.excludeValue}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Layers size={64} className="mb-4 text-slate-200 dark:text-slate-800" />
                <p className="font-bold text-slate-900 dark:text-white text-lg">Chart Canvas</p>
                <p className="text-sm text-slate-500">Configure your data fields on the left to generate a preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Styles */}
        <div className="shrink-0 w-80 bg-slate-50 dark:bg-[#0f1115] border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1b1e]">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Chart Configuration</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-white dark:bg-[#0f1115]">
            <DynamicChartControls
              config={visualConfig}
              onChange={setVisualConfig}
              chartType={chartType}
            />

            {/* Color Palette Section */}
            <div className="h-px bg-slate-200 dark:bg-slate-800" />
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-brand" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Color Palette</label>
              </div>
              <div className="flex flex-col gap-2">
                {Object.keys(PALETTES).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPalette(p as any)}
                    className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${selectedPalette === p 
                      ? 'border-brand ring-4 ring-brand/10 bg-white dark:bg-[#1e1e1e] shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-brand/40 bg-white dark:bg-[#1a1b1e]'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{p}</span>
                    <div className="flex gap-1">
                      {PALETTES[p as keyof typeof PALETTES].slice(0, 5).map((c, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full shadow-sm border border-white/20" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800" />

            {/* Quick Style Overrides for Backward Compatibility */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="text-slate-400" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Styles</label>
              </div>
              
              <div className="space-y-3 p-3 bg-white dark:bg-[#1a1b1e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Background Color</span>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-[#0f1115] rounded-lg border border-slate-100 dark:border-slate-700">
                    <input
                      type="color"
                      value={visualConfig.backgroundColor || '#ffffff'}
                      onChange={e => setVisualConfig((v: any) => ({ ...v, backgroundColor: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                    />
                    <span className="text-[11px] font-mono font-semibold text-slate-400">{visualConfig.backgroundColor || '#ffffff'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Chart Title Font Size</span>
                  <input
                    type="number"
                    value={visualConfig.headerFontSize || 14}
                    onChange={e => setVisualConfig((v: any) => ({ ...v, headerFontSize: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-100 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SaveAssetModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={confirmSave}
        initialTitle={chartTitle}
        initialFolderId={folderId}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
};

export default ChartBuilderPage;
