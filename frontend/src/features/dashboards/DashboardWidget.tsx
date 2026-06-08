import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import EChartWrapper from '../../components/charts/EChartWrapper';
import DrillBreadcrumbs from '../../components/charts/DrillBreadcrumbs';
import { transformChartData } from '../../utils/chartUtils';
import { useDrillDown } from '../../components/charts/useDrillDown';
import { AlertCircle, MoreHorizontal, FileSpreadsheet, Image as ImageIcon, Type } from 'lucide-react';
import * as echarts from 'echarts';
import toast from 'react-hot-toast';

interface DashboardWidgetProps {
  chartId: number;
  height?: string;
  filters?: Record<string, any>;
  refetchInterval?: number | false;
  theme?: string;
  dashboardId?: number;
  dashboardName?: string;
  onDrillFiltersChange?: (filters: Record<string, any>, drillStack: any[]) => void;
  restoreDrillAction?: { stack: any[]; timestamp: number };
}

const LoadingAnimation = ({ small = false }: { small?: boolean }) => (
  <div className={`flex flex-col items-center justify-center ${small ? 'space-y-1' : 'space-y-4'} animate-in fade-in duration-500`}>
    <div className={`flex items-center justify-center ${small ? 'gap-0.5 h-4' : 'gap-1.5 h-12'}`}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={`${small ? 'w-0.5' : 'w-1.5'} bg-brand rounded-full`}
          style={{
            height: small ? '6px' : '16px',
            animation: `barGrow ${small ? '0.6s' : '1s'} ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
    {!small && <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Computing...</p>}
  </div>
);

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  chartId,
  height = '100%',
  filters,
  refetchInterval = false,
  theme,
  dashboardId,
  dashboardName,
  onDrillFiltersChange,
  restoreDrillAction
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [userToggledTitleHidden, setUserToggledTitleHidden] = useState<boolean | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('drill-bar-portal'));
  }, []);

  // Drill-down state
  const drill = useDrillDown(restoreDrillAction);

  // Propagate drill filters up to parent dashboard so other charts can apply them
  const onDrillFiltersChangeRef = useRef(onDrillFiltersChange);
  useEffect(() => {
    onDrillFiltersChangeRef.current = onDrillFiltersChange;
  }, [onDrillFiltersChange]);

  useEffect(() => {
    if (onDrillFiltersChangeRef.current) {
      onDrillFiltersChangeRef.current(drill.drillFilters, drill.drillStack);
    }
  }, [drill.drillFilters, drill.drillStack]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch chart details to get default_filters
  const { data: chart } = useQuery({
    queryKey: ['charts', chartId],
    queryFn: async () => {
      const response = await api.get(`/api/charts/${chartId}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get available columns from chart's dataset for drill targets
  const datasetId = chart?.dataset_id;
  const { data: datasetDetail } = useQuery({
    queryKey: ['datasets', datasetId],
    queryFn: async () => {
      const response = await api.get(`/api/datasets/${datasetId}`);
      return response.data;
    },
    enabled: !!datasetId,
    staleTime: 10 * 60 * 1000,
  });

  const availableColumns = useMemo(() => {
    if (!datasetDetail?.columns) return [];
    return datasetDetail.columns.map((c: any) => c.column_name);
  }, [datasetDetail]);

  // Merge chart's default_filters with global dashboard filters + drill filters
  // Global filters take precedence over chart default filters
  const mergedFilters = useMemo(() => {
    const defaultFilters = chart?.query_config?.default_filters || {};
    const globalFiltersAST = filters || {};

    const children: any[] = [];

    // 1. Add default filters
    if (defaultFilters.type === 'group') {
      children.push(...(defaultFilters.children || []));
    } else {
      Object.entries(defaultFilters).forEach(([key, value]) => {
        if (key !== 'type' && key !== 'operator' && key !== 'children' && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)) {
          children.push({
            type: 'rule',
            column_name: key,
            operator: Array.isArray(value) ? 'IN' : 'EQUALS',
            value: value
          });
        }
      });
    }

    // 2. Add global/effective filters AST
    if (globalFiltersAST.type === 'group') {
      children.push(...(globalFiltersAST.children || []));
    } else {
      Object.entries(globalFiltersAST).forEach(([key, value]) => {
        if (key !== 'type' && key !== 'operator' && key !== 'children' && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)) {
          children.push({
            type: 'rule',
            column_name: key,
            operator: Array.isArray(value) ? 'IN' : 'EQUALS',
            value: value
          });
        }
      });
    }

    // 3. Add drill-down filters
    Object.entries(drill.drillFilters).forEach(([key, filterLevels]) => {
      // filterLevels is an array of filters applied at different drill steps
      const levels = Array.isArray(filterLevels) ? filterLevels : [filterLevels];
      
      levels.forEach(levelValue => {
        if (Array.isArray(levelValue)) {
          const inValues = levelValue.filter(v => typeof v !== 'string' || !v.startsWith('__EXCLUDE__'));
          const excludeValues = levelValue.filter(v => typeof v === 'string' && v.startsWith('__EXCLUDE__')).map(v => v.replace(/^__EXCLUDE__/, ''));
          
          if (inValues.length > 0) {
            children.push({
              type: 'rule',
              column_name: key,
              operator: inValues.length > 1 ? 'IN' : 'EQUALS',
              value: inValues.length > 1 ? inValues : inValues[0]
            });
          }
          if (excludeValues.length > 0) {
            children.push({
              type: 'rule',
              column_name: key,
              operator: excludeValues.length > 1 ? 'NOT_IN' : 'NOT_EQUALS',
              value: excludeValues.length > 1 ? excludeValues : excludeValues[0]
            });
          }
        } else {
          let isExclude = false;
          let actualValue: any = levelValue;
          
          if (typeof levelValue === 'string' && levelValue.startsWith('__EXCLUDE__')) {
            isExclude = true;
            actualValue = levelValue.substring(11);
          }

          children.push({
            type: 'rule',
            column_name: key,
            operator: isExclude ? 'NOT_EQUALS' : 'EQUALS',
            value: actualValue
          });
        }
      });
    });

    if (children.length === 0) return {};

    return {
      type: 'group',
      operator: 'AND',
      children: children
    };
  }, [chart, filters, drill.drillFilters]);

  const handleDownloadCSV = () => {
    const rawData = chartResponse?.data;
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      toast.error("No data available to download");
      return;
    }
    const cols = Object.keys(rawData[0] || {});
    const csvContent = [
      cols.join(','),
      ...rawData.map((row: any) => cols.map(c => {
        const val = row[c];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${chartResponse?.title || 'chart_data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsMenuOpen(false);
  };

  const handleDownloadPNG = () => {
    if (!widgetRef.current) return;
    const echartsDiv = widgetRef.current.querySelector('div[_echarts_instance_]') as HTMLElement;
    if (echartsDiv) {
      const instance = echarts.getInstanceByDom(echartsDiv);
      if (instance) {
        const url = instance.getDataURL({
          type: 'png',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff'
        });
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${chartResponse?.title || 'chart'}.png`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("Could not generate image from chart instance");
      }
    } else {
      toast.error("PNG download is not supported for this chart type");
    }
    setIsMenuOpen(false);
  };

  const { data: chartResponse, isLoading, isFetching, error } = useQuery({
    queryKey: ['charts', chartId, 'data', mergedFilters, drill.currentDimension],
    queryFn: async () => {
      let overriddenQueryConfig = undefined;
      if (drill.currentDimension && chart?.query_config) {
        overriddenQueryConfig = {
          ...chart.query_config,
          dimensions: [drill.currentDimension]
        };
      }

      const response = await api.post(`/api/charts/${chartId}/data`, {
        chart_id: chartId,
        filters: mergedFilters,
        dashboard_id: dashboardId,
        dashboard_name: dashboardName,
        query_config: overriddenQueryConfig
      });
      return response.data;
    },
    enabled: !!chart,
    refetchInterval
  });

  // Transform backend data to ECharts format
  const rawData = chartResponse?.data || [];
  const chart_type = chartResponse?.chart_type || 'bar';
  const query_config = chartResponse?.query_config || {};
  const dimensions = query_config?.dimensions || [];
  const metrics = query_config?.metrics || [];
  const pivotColumns = query_config?.pivotColumns || [];

  // Determine active dimension name (first dimension's name/alias)
  const activeDimensionName = useMemo(() => {
    if (dimensions.length === 0) return '';
    const d = dimensions[0];
    return typeof d === 'string' ? d : (d.alias || d.name || '');
  }, [dimensions]);

  const chartData = transformChartData(rawData, chart_type, dimensions, metrics, pivotColumns);

  const isMetadataLoading = !chart;
  const isDataError = error || (!isLoading && !chartResponse && chart);

  // Calculate actual title visibility based on DB config + local overrides
  const isTitleHiddenByDefault = !(chartResponse?.visual_config?.general?.showTitle === true);
  const isTitleHidden = userToggledTitleHidden !== null ? userToggledTitleHidden : isTitleHiddenByDefault;

  if (isDataError && !isMetadataLoading) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 p-6 text-center bg-red-50/30 dark:bg-red-950/10 rounded-xl m-2">
        <div>
          <AlertCircle size={24} className="mb-2 mx-auto opacity-50" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400">Data Error</p>
          <p className="text-[9px] text-red-400/80 dark:text-red-500/60 mt-1">Failed to fetch chart analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden group"
      ref={widgetRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsMenuOpen(false); }}
    >
      {/* Loading Overlay (Centered) */}
      {(isLoading || isFetching) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950 transition-all duration-300">
          <LoadingAnimation small={isFetching && !isLoading} />
        </div>
      )}

      {/* Hover Action Menu */}
      {(isHovered || isMenuOpen) && chartResponse && (
        <div className="absolute top-2 right-2 z-40 transition-opacity duration-200" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 bg-white/80 hover:bg-white shadow-sm border border-slate-200 rounded-md text-slate-500 hover:text-brand transition-all backdrop-blur-sm"
            title="More Options"
          >
            <MoreHorizontal size={14} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden py-1 animate-in fade-in slide-in-from-top-1">
              <button
                onClick={handleDownloadCSV}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-brand flex items-center gap-2 font-medium transition-colors"
              >
                <FileSpreadsheet size={12} />
                Download CSV
              </button>
              <button
                onClick={handleDownloadPNG}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-brand flex items-center gap-2 font-medium transition-colors"
              >
                <ImageIcon size={12} />
                Download PNG
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2" />
              <button
                onClick={() => {
                  setUserToggledTitleHidden(!isTitleHidden);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-brand flex items-center gap-2 font-medium transition-colors"
              >
                <Type size={12} />
                {isTitleHidden ? 'Show Title' : 'Hide Title'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div className={`h-full transition-opacity duration-300 ${(isLoading || (isFetching && !chartResponse)) ? 'opacity-0' : 'opacity-100'}`}>
        {chartResponse && (
          <EChartWrapper
            chartType={chart_type}
            data={chartData}
            height={height}
            title={chartResponse.title}
            visualConfig={chartResponse.visual_config}
            hideHeader={isTitleHidden}
            theme={theme}
            drillStack={drill.drillStack}
            availableColumns={availableColumns}
            currentDimensionName={activeDimensionName}
            onDrillDown={drill.drillDown}
            onDrillUp={drill.drillUp}
            onDrillToLevel={drill.drillToLevel}
            onResetDrill={drill.resetDrill}
            onFilterByValue={drill.filterByValue}
            onExcludeValue={drill.excludeValue}
          />
        )}
      </div>

      {/* Drill Breadcrumbs via Portal */}
      {drill.drillStack.length > 0 && portalTarget && createPortal(
        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 shrink-0 mr-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{chartResponse?.title || 'Chart'}:</span>
          <DrillBreadcrumbs
            drillStack={drill.drillStack}
            originalDimensionLabel={activeDimensionName || 'All'}
            onDrillToLevel={drill.drillToLevel}
            onResetDrill={drill.resetDrill}
            onRemoveFilterValue={drill.removeFilterValue}
          />
        </div>,
        portalTarget
      )}
    </div>
  );
};

export default DashboardWidget;
