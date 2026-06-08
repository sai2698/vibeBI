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
  Layers, Table as TableIcon, LayoutGrid, Loader2, Folder, FileCode2, SaveAll, Settings2,
  AlertTriangle, AlertCircle, ArrowUpDown, CalendarDays
} from 'lucide-react';
import SaveAssetModal from './components/SaveAssetModal';
import DynamicChartControls from './components/DynamicChartControls';
import SortableShelf from './components/SortableShelf';
import ChartErrorBoundary from '../../components/charts/ChartErrorBoundary';
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

// ── Enterprise Chart Specification Registry ──
// Comprehensive validation rules per chart type (inspired by Superset/Tableau)
interface ChartSpec {
  minDim: number;
  maxDim?: number;
  minMet: number;
  maxMet?: number;
  minPivotCols?: number;
  maxPivotCols?: number;
  requiresPivotCols?: boolean;
  msg: string;
  dimLabel?: string;
  metLabel?: string;
}

const CHART_SPEC: Record<string, ChartSpec> = {
  kpi:        { minDim: 0, maxDim: 0, minMet: 1, maxMet: 1, msg: 'KPI needs exactly 1 measure, no dimensions' },
  gauge:      { minDim: 0, maxDim: 0, minMet: 1, maxMet: 1, msg: 'Gauge needs exactly 1 measure, no dimensions' },
  table:      { minDim: 0, minMet: 0, msg: 'Table needs at least 1 dimension or 1 measure' },
  pivot:      { minDim: 1, minMet: 1, minPivotCols: 1, requiresPivotCols: true, msg: 'Pivot needs 1+ row dims, 1+ column dims, and 1 measure', dimLabel: 'Rows', metLabel: 'Measures' },
  bar:        { minDim: 1, minMet: 1, msg: 'Bar needs 1+ dimensions and 1+ measures' },
  line:       { minDim: 1, minMet: 1, msg: 'Line needs 1+ dimensions and 1+ measures' },
  area:       { minDim: 1, minMet: 1, msg: 'Area needs 1+ dimensions and 1+ measures' },
  pie:        { minDim: 1, maxDim: 1, minMet: 1, maxMet: 1, msg: 'Pie needs exactly 1 dimension and 1 measure' },
  donut:      { minDim: 1, maxDim: 1, minMet: 1, maxMet: 1, msg: 'Donut needs exactly 1 dimension and 1 measure' },
  scatter:    { minDim: 0, minMet: 2, msg: 'Scatter needs at least 2 measures (X and Y axis)' },
  heatmap:    { minDim: 1, maxDim: 1, minMet: 1, maxMet: 1, minPivotCols: 1, maxPivotCols: 1, requiresPivotCols: true, msg: 'Heatmap needs 1 row dimension (Y-axis), 1 column dimension (X-axis), and 1 measure', dimLabel: 'Y-Axis', metLabel: 'Values' },
  treemap:    { minDim: 1, minMet: 1, maxMet: 1, msg: 'Treemap needs 1+ dimensions and 1 measure' },
  sunburst:   { minDim: 1, minMet: 1, maxMet: 1, msg: 'Sunburst needs 1+ dimensions and 1 measure' },
  funnel:     { minDim: 1, maxDim: 1, minMet: 1, maxMet: 1, msg: 'Funnel needs exactly 1 dimension and 1 measure' },
  boxplot:    { minDim: 1, minMet: 1, msg: 'Boxplot needs 1+ dimensions and 1+ measures' },
  sankey:     { minDim: 2, maxDim: 2, minMet: 1, maxMet: 1, msg: 'Sankey needs exactly 2 dimensions (source & target) and 1 measure' },
  calendar:   { minDim: 1, maxDim: 1, minMet: 1, maxMet: 1, msg: 'Calendar needs 1 date dimension and 1 measure' },
  radar:      { minDim: 1, minMet: 1, msg: 'Radar needs 1+ dimensions and 1+ measures' },
  parallel:   { minDim: 0, minMet: 2, msg: 'Parallel coordinates needs 2+ measures' },
  themeRiver: { minDim: 1, maxDim: 1, minMet: 1, maxMet: 1, msg: 'Theme River needs 1 time dimension and 1 measure' },
  graph:      { minDim: 1, minMet: 0, msg: 'Graph needs 1+ dimensions' },
  chord:      { minDim: 2, maxDim: 2, minMet: 1, maxMet: 1, msg: 'Chord needs 2 dimensions and 1 measure' },
  pictorialBar: { minDim: 1, minMet: 1, msg: 'Pictorial Bar needs 1+ dimensions and 1+ measures' },
};

// ── Validation Engine ──
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateChartConfig(
  chartType: string,
  dims: any[],
  mets: any[],
  pivotCols: any[]
): ValidationResult {
  const spec = CHART_SPEC[chartType];
  if (!spec) return { valid: true, errors: [], warnings: [] };

  const errors: string[] = [];
  const warnings: string[] = [];
  const totalDims = dims.length;
  const totalMets = mets.length;
  const totalPivotCols = pivotCols.length;

  // Table special case: needs at least 1 of either
  if (chartType === 'table' && totalDims === 0 && totalMets === 0) {
    errors.push('Table needs at least 1 dimension or 1 measure');
    return { valid: false, errors, warnings };
  }

  // Skip further checks for table if it has anything
  if (chartType === 'table') return { valid: true, errors: [], warnings: [] };

  const dl = spec.dimLabel || 'dimension';
  const ml = spec.metLabel || 'measure';

  if (totalDims < spec.minDim)
    errors.push(`Needs at least ${spec.minDim} ${dl}(s) — currently ${totalDims}`);
  if (spec.maxDim !== undefined && totalDims > spec.maxDim)
    warnings.push(`Max ${spec.maxDim} ${dl}(s) recommended — currently ${totalDims}`);

  if (totalMets < spec.minMet)
    errors.push(`Needs at least ${spec.minMet} ${ml}(s) — currently ${totalMets}`);
  if (spec.maxMet !== undefined && totalMets > spec.maxMet)
    warnings.push(`Max ${spec.maxMet} ${ml}(s) recommended — currently ${totalMets}`);

  if (spec.requiresPivotCols && totalPivotCols < (spec.minPivotCols || 1))
    errors.push(`Needs at least ${spec.minPivotCols || 1} column dimension(s) — currently ${totalPivotCols}`);
  if (spec.maxPivotCols !== undefined && totalPivotCols > spec.maxPivotCols)
    warnings.push(`Max ${spec.maxPivotCols} column dimension(s) recommended — currently ${totalPivotCols}`);

  return { valid: errors.length === 0, errors, warnings };
}

// ── Friendly Error Message Parser ──
function parseFriendlyError(errorMsg: string): { friendly: string; raw: string } {
  const raw = errorMsg;
  const lower = errorMsg.toLowerCase();

  if (lower.includes('column') && lower.includes('does not exist'))
    return { friendly: 'A selected column was not found in your dataset. Try refreshing the schema metadata.', raw };
  if (lower.includes('division by zero'))
    return { friendly: 'A division by zero occurred. Check your metric expressions for zero denominators.', raw };
  if (lower.includes('timeout') || lower.includes('timed out'))
    return { friendly: 'Query took too long. Try adding filters to reduce data volume or increase the timeout.', raw };
  if (lower.includes('permission denied'))
    return { friendly: 'Database permission denied. Contact your admin to grant access to this table.', raw };
  if (lower.includes('syntax error'))
    return { friendly: 'SQL syntax error in the generated query. This may indicate a data configuration issue.', raw };
  if (lower.includes('relation') && lower.includes('does not exist'))
    return { friendly: 'The underlying table or view was not found. The dataset may have been renamed or deleted.', raw };

  return { friendly: errorMsg, raw };
}

// ── Data Type Icon Helper ──
function getDataTypeIcon(dataType: string) {
  const dt = (dataType || '').toLowerCase();
  if (dt.includes('int') || dt.includes('float') || dt.includes('decimal') || dt.includes('numeric') || dt.includes('number') || dt.includes('double') || dt.includes('real'))
    return <Hash size={11} className="text-emerald-500" />;
  if (dt.includes('date') || dt.includes('time') || dt.includes('timestamp'))
    return <CalendarDays size={11} className="text-amber-500" />;
  return <Type size={11} className="text-blue-500" />;
}

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
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
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

      const rawOrderBy = chartToEdit.query_config?.orderBy || [];
      if (rawOrderBy.length > 0) {
        setSortBy(rawOrderBy[0].column || '');
        setSortDirection(rawOrderBy[0].direction || 'DESC');
      } else {
        setSortBy('');
        setSortDirection('DESC');
      }

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
          orderBy: sortBy ? [{ column: sortBy, direction: sortDirection }] : [],
          limit: 1000
        },
        filters: filterDict
      });
      return response.data;
    },
  });

  // Transform preview data for ECharts (with crash protection)
  const chartData = useMemo(() => {
    try {
      const res = previewMutation.data;
      if (!res || !res.data) return { series: [] };
      return transformChartData(res.data, chartType, dimensions, metrics, pivotColumns);
    } catch (err) {
      console.error('[ChartBuilder] transformChartData failed:', err);
      return { series: [] };
    }
  }, [previewMutation.data, dimensions, metrics, chartType, pivotColumns]);

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
    // Remove from other shelf if exists (prevent duplicate)
    if (pivotColumns.some(d => d.name === col)) {
      setPivotColumns(prev => prev.filter(d => d.name !== col));
      toast(`Moved "${col}" from Columns to Rows`, { icon: '⇄' });
    }
  };

  const togglePivotColumn = (col: string) => {
    setPivotColumns(prev => {
      const exists = prev.find(d => d.name === col);
      if (exists) return prev.filter(d => d.name !== col);
      return [...prev, { name: col, alias: col }];
    });
    // Remove from other shelf if exists (prevent duplicate)
    if (dimensions.some(d => d.name === col)) {
      setDimensions(prev => prev.filter(d => d.name !== col));
      toast(`Moved "${col}" from Rows to Columns`, { icon: '⇄' });
    }
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
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      queryClient.invalidateQueries({ queryKey: ['chartData'] });
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
    
    if (id && id !== 'builder') {
      confirmSave(chartTitle, folderId);
    } else {
      setIsSaveModalOpen(true);
    }
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
        orderBy: sortBy ? [{ column: sortBy, direction: sortDirection }] : [],
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

  // ── Validation ──
  const validation = useMemo(
    () => validateChartConfig(chartType, dimensions, metrics, pivotColumns),
    [chartType, dimensions, metrics, pivotColumns]
  );

  // ── Friendly API error ──
  const apiError = useMemo(() => {
    if (!previewMutation.error) return null;
    const detail = (previewMutation.error as any)?.response?.data?.detail || (previewMutation.error as Error)?.message || 'Unknown error';
    return parseFriendlyError(detail);
  }, [previewMutation.error]);

  if (isChartLoading && id) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-brand" size={48} />
      </div>
    );
  }
  const isPivotMode = chartType === 'pivot' || chartType === 'heatmap';
  const spec = CHART_SPEC[chartType];

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
            disabled={previewMutation.isPending || !selectedDatasetId || !validation.valid}
            title={!validation.valid ? validation.errors[0] : undefined}
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
            {id && id !== 'builder' ? 'Update Chart' : 'Save Asset'}
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
                        <div className="flex items-center gap-1.5">
                          {getDataTypeIcon(col.data_type)}
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{col.friendly_name || col.column_name}</span>
                        </div>
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

          {/* Shelves (Tableau/Qlik Style with Drag-and-Drop Reordering) */}
          <div className="shrink-0 bg-white dark:bg-[#0f1115] border-b border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-3">
            {/* Row Dimensions / Standard Dimensions */}
            <SortableShelf
              label={isPivotMode ? (spec?.dimLabel || 'Rows') : 'Columns'}
              items={dimensions}
              onReorder={setDimensions}
              onAliasChange={(idx, val) => {
                const newDims = [...dimensions];
                newDims[idx].alias = val;
                setDimensions(newDims);
              }}
              onRemove={(name) => toggleDimension(name)}
              color="blue"
              emptyText={isPivotMode ? 'Drop row dimensions here' : 'Drop dimensions here'}
            />

            {/* Column Dimensions (Pivot / Heatmap) */}
            {isPivotMode && (
              <SortableShelf
                label="Columns"
                items={pivotColumns}
                onReorder={setPivotColumns}
                onAliasChange={(idx, val) => {
                  const newCols = [...pivotColumns];
                  newCols[idx].alias = val;
                  setPivotColumns(newCols);
                }}
                onRemove={(name) => togglePivotColumn(name)}
                color="purple"
                emptyText="Drop column dimensions here"
              />
            )}

            {/* Measures / Values */}
            <SortableShelf
              label={isPivotMode ? (spec?.metLabel || 'Measures') : 'Values'}
              items={metrics}
              onReorder={setMetrics}
              onAliasChange={(idx, val) => {
                const newMets = [...metrics];
                newMets[idx].alias = val;
                setMetrics(newMets);
              }}
              onRemove={(name) => toggleMetric(name)}
              color="green"
              emptyText="Drop measures here"
            />

            {/* Sort Order Control */}
            <div className="flex items-center gap-4">
              <span className="w-16 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sort By</span>
              <div className="flex-1 flex items-center gap-3 bg-slate-50/80 dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-800 rounded-md p-1.5 shadow-inner">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white dark:bg-[#2d2f34] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded text-[11px] font-semibold p-1 outline-none"
                >
                  <option value="">Default (Auto-sort)</option>
                  {dimensions.map((d) => (
                    <option key={d.name} value={d.alias || d.name}>{d.alias || d.name} (Dimension)</option>
                  ))}
                  {pivotColumns.map((d) => (
                    <option key={d.name} value={d.alias || d.name}>{d.alias || d.name} (Column)</option>
                  ))}
                  {metrics.map((m) => (
                    <option key={m.name} value={m.alias || m.name}>{m.alias || m.name} (Measure)</option>
                  ))}
                </select>

                {sortBy && (
                  <button
                    onClick={() => setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#2d2f34] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold shadow-sm hover:bg-slate-50 transition-all"
                  >
                    <ArrowUpDown size={12} className="text-slate-500" />
                    <span className="text-[10px] font-bold">{sortDirection}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Validation Banners */}
            {selectedDatasetId && validation.errors.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg animate-in fade-in duration-200">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  {validation.errors.map((e, i) => (
                    <span key={i} className="text-[11px] font-semibold text-red-600 dark:text-red-400">{e}</span>
                  ))}
                </div>
              </div>
            )}
            {selectedDatasetId && validation.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg animate-in fade-in duration-200">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  {validation.warnings.map((w, i) => (
                    <span key={i} className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col min-h-0 relative m-4 bg-white dark:bg-[#1e1e1e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-colors">
            {previewMutation.isPending && (
              <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                <LoadingAnimation />
              </div>
            )}

            {/* API Error Banner */}
            {apiError && !previewMutation.isPending && (
              <div className="shrink-0 m-4 mb-0 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">{apiError.friendly}</p>
                    {apiError.raw !== apiError.friendly && (
                      <details className="mt-1">
                        <summary className="text-[10px] font-bold text-red-500/70 cursor-pointer hover:text-red-500">Show raw error</summary>
                        <pre className="mt-1 text-[10px] font-mono text-red-600/80 dark:text-red-400/70 whitespace-pre-wrap break-all">{apiError.raw}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!validation.valid && selectedDatasetId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                  <Filter size={32} className="text-amber-500" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">Configuration Required</p>
                <p className="text-sm text-slate-500 mt-1 max-w-md text-center">{CHART_SPEC[chartType]?.msg || 'Add dimensions and measures to build this chart'}</p>
              </div>
            ) : selectedDatasetId && (dimensions.length > 0 || metrics.length > 0) ? (
              <div className="flex-1 flex flex-col p-6">
                <ChartErrorBoundary chartType={chartType} onReset={() => { setDimensions([]); setMetrics([]); setPivotColumns([]); }}>
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
                </ChartErrorBoundary>
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
