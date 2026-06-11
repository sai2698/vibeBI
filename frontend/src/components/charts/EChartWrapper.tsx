import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { registerAllThemes, getThemeMeta } from './themes';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import DrillContextMenu from './DrillContextMenu';
import toast from 'react-hot-toast';
import type { DrillMenuClickInfo } from './DrillContextMenu';
import type { DrillLevel } from './useDrillDown';
import { displayCategoryValue, toSentinelValue } from '../../utils/chartUtils';

// Chart type builders
import {
  buildBarChartOptions,
  buildLineChartOptions,
  buildAreaChartOptions,
  buildPieChartOptions,
  buildDonutChartOptions,
  buildScatterChartOptions,
  buildHeatmapChartOptions,
  buildRadarChartOptions,
  buildTreemapChartOptions,
  buildSunburstChartOptions,
  buildFunnelChartOptions,
  buildGaugeChartOptions,
} from './types';

import { DataTableChart } from './types/DataTableChart';
import { PivotTableChart } from './types/PivotTableChart';
import { KPITileChart } from './types/KPITileChart';
import { MultiKPITileChart } from './types/MultiKPITileChart';

// Run custom themes registration on startup
registerAllThemes();

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap'
  | 'radar'
  | 'funnel'
  | 'gauge'
  | 'treemap'
  | 'sunburst'
  | 'sankey'
  | 'boxplot'
  | 'waterfall'
  | 'graph'
  | 'tree'
  | 'parallel'
  | 'pictorialBar'
  | 'themeRiver'
  | 'calendar'
  | 'chord'
  | 'kpi'
  | 'dataTable'
  | 'pivotTable'
  | 'table'
  | 'pivot'
  | 'multikpi'
  | 'geomap'
  | 'custom';

interface ChartData {
  categories?: string[];
  xAxisCategories?: string[];   // Used by heatmap for X-axis labels
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  pivotData?: any;
}

interface EChartWrapperProps {
  chartType: ChartType;
  data: ChartData;
  title?: string;
  height?: string;
  visualConfig?: Record<string, unknown>;
  hideHeader?: boolean;
  theme?: string;
  // Drill-down props
  drillStack?: DrillLevel[];
  availableColumns?: string[];
  currentDimensionName?: string;
  onDrillDown?: (fromDimension: string, toDimension: string, clickedValue: string | string[]) => void;
  onDrillUp?: () => void;
  onDrillToLevel?: (level: number) => void;
  onResetDrill?: () => void;
  onFilterByValue?: (column: string | Record<string, string | string[]>, value?: string | string[]) => void;
  onExcludeValue?: (column: string | Record<string, string | string[]>, value?: string | string[]) => void;
}

const brandColors = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
  '#F97316', '#06B6D4', '#84CC16', '#A855F7',
];

// Chart types that use an ECharts Cartesian grid (xAxis/yAxis)
// These use the Zr-level contextmenu + convertFromPixel approach.
// All other chart types use ECharts instance.on('contextmenu') exclusively.
const CARTESIAN_CHART_TYPES = new Set([
  'bar', 'line', 'area', 'scatter', 'heatmap', 'boxplot', 'pictorialBar',
]);

import { buildGeoMapChartOptions } from './types/GeoMapChart';

function buildOption(chartType: ChartType, dataInput: ChartData, _title?: string, visualConfig?: any, theme?: string, themeMeta?: any): EChartsOption {
  const data = {
    ...dataInput,
    categories: dataInput?.categories || [],
    series: dataInput?.series || [],
  };

  // Determine colors based on theme
  const colors = (theme && theme !== 'default' && themeMeta?.colors)
    ? themeMeta.colors
    : (visualConfig?.colorPalette || brandColors);

  // Map nested Superset config to flat structure for backward compatibility
  const cfg = {
    // X-Axis
    xAxisTitle: visualConfig?.x_axis?.title ?? visualConfig?.xAxisTitle,
    xAxisShow: visualConfig?.x_axis?.show ?? visualConfig?.xAxisShow,
    xAxisRotation: visualConfig?.x_axis?.labelRotation ?? visualConfig?.xAxisRotation,
    xAxisFormat: visualConfig?.x_axis?.format ?? visualConfig?.xAxisFormat,
    xAxisScale: visualConfig?.x_axis?.scale ?? visualConfig?.xAxisScale,
    xAxisTruncate: visualConfig?.x_axis?.truncate ?? visualConfig?.xAxisTruncate,
    xAxisShowGridLines: visualConfig?.x_axis?.showGridLines ?? visualConfig?.xAxisShowGridLines,

    // Y-Axis
    yAxisTitle: visualConfig?.y_axis?.title ?? visualConfig?.yAxisTitle,
    yAxisShow: visualConfig?.y_axis?.show ?? visualConfig?.yAxisShow,
    yAxisFormat: visualConfig?.y_axis?.format ?? visualConfig?.yAxisFormat,
    yAxisScale: visualConfig?.y_axis?.scale ?? visualConfig?.yAxisScale,
    yAxisTruncate: visualConfig?.y_axis?.truncate ?? visualConfig?.yAxisTruncate,
    yAxisShowGridLines: visualConfig?.y_axis?.showGridLines ?? visualConfig?.yAxisShowGridLines,

    // Legend
    showLegend: visualConfig?.legend?.show ?? visualConfig?.showLegend,
    legendOrientation: visualConfig?.legend?.orientation ?? visualConfig?.legendOrientation,
    legendPosition: visualConfig?.legend?.position ?? visualConfig?.legendPosition,
    legendSortBy: visualConfig?.legend?.sortBy ?? visualConfig?.legendSortBy,

    // Data Labels
    showLabels: visualConfig?.dataLabels?.show ?? visualConfig?.showLabels,
    labelPosition: visualConfig?.dataLabels?.position ?? visualConfig?.labelPosition,
    labelFormat: visualConfig?.dataLabels?.format ?? visualConfig?.labelFormat,
    labelShowZero: visualConfig?.dataLabels?.showZero ?? visualConfig?.labelShowZero,

    // Bar chart
    stacking: visualConfig?.bar?.stacking ?? visualConfig?.stacking,
    barOrientation: visualConfig?.bar?.orientation ?? visualConfig?.barOrientation,
    barWidth: visualConfig?.bar?.barWidth ?? visualConfig?.barWidth,

    // Line chart
    smoothCurves: visualConfig?.line?.smooth ?? visualConfig?.smoothCurves ?? visualConfig?.smooth,
    showPoints: visualConfig?.line?.showPoints ?? visualConfig?.showPoints,
    areaFill: visualConfig?.line?.areaFill ?? visualConfig?.areaFill,
    areaOpacity: visualConfig?.line?.areaOpacity ?? visualConfig?.areaOpacity,
    step: visualConfig?.line?.step ?? visualConfig?.step,
    symbol: visualConfig?.line?.symbol ?? visualConfig?.symbol,

    // Pie/Donut chart
    donut: visualConfig?.pie?.donut ?? visualConfig?.donut,
    innerRadius: visualConfig?.pie?.innerRadius ?? visualConfig?.innerRadius,
    outerRadius: visualConfig?.pie?.outerRadius ?? visualConfig?.outerRadius,
    padAngle: visualConfig?.pie?.padAngle ?? visualConfig?.donut?.padAngle ?? visualConfig?.padAngle,
    borderRadius: visualConfig?.pie?.borderRadius ?? visualConfig?.donut?.borderRadius ?? visualConfig?.borderRadius,

    // Tooltip
    tooltipShow: visualConfig?.tooltip?.show ?? visualConfig?.tooltipShow,
    tooltipTrigger: visualConfig?.tooltip?.trigger ?? visualConfig?.tooltipTrigger,

    // Toolbox
    toolboxShow: visualConfig?.toolbox?.show ?? visualConfig?.toolboxShow,

    // Data Zoom
    dataZoomShow: visualConfig?.dataZoom?.show ?? visualConfig?.dataZoomShow,
    dataZoomType: visualConfig?.dataZoom?.type ?? visualConfig?.dataZoomType,
    dataZoomOrient: visualConfig?.dataZoom?.orient ?? visualConfig?.dataZoomOrient,

    // Animation
    animationDuration: visualConfig?.animation?.duration ?? visualConfig?.animationDuration,

    // Legacy flat props
    colorPalette: colors,
    backgroundColor: visualConfig?.backgroundColor,
  };

  // Use delegated chart builders for supported chart types
  switch (chartType) {
    case 'bar':
      return buildBarChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          xAxisTitle: cfg.xAxisTitle,
          xAxisRotation: cfg.xAxisRotation,
          xAxisTruncate: cfg.xAxisTruncate,
          yAxisTitle: cfg.yAxisTitle,
          showLegend: cfg.showLegend,
          legendOrientation: cfg.legendOrientation,
          showLabels: cfg.showLabels,
          labelPosition: cfg.labelPosition,
          stacking: cfg.stacking,
          barWidth: cfg.barWidth,
          barOrientation: cfg.barOrientation,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'line':
      return buildLineChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          xAxisTitle: cfg.xAxisTitle,
          xAxisRotation: cfg.xAxisRotation,
          xAxisTruncate: cfg.xAxisTruncate,
          yAxisTitle: cfg.yAxisTitle,
          showLegend: cfg.showLegend,
          legendOrientation: cfg.legendOrientation,
          showLabels: cfg.showLabels,
          labelPosition: cfg.labelPosition,
          stacking: cfg.stacking,
          smooth: cfg.smoothCurves,
          showPoints: cfg.showPoints,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'area':
      return buildAreaChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          xAxisTitle: cfg.xAxisTitle,
          xAxisRotation: cfg.xAxisRotation,
          xAxisTruncate: cfg.xAxisTruncate,
          yAxisTitle: cfg.yAxisTitle,
          showLegend: cfg.showLegend,
          legendOrientation: cfg.legendOrientation,
          showLabels: cfg.showLabels,
          labelPosition: cfg.labelPosition,
          stacking: cfg.stacking,
          smooth: cfg.smoothCurves,
          showPoints: cfg.showPoints,
          areaFill: cfg.areaFill,
          areaOpacity: cfg.areaOpacity,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'pie':
      return buildPieChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          legendOrientation: cfg.legendOrientation,
          showLabels: cfg.showLabels,
          labelPosition: cfg.labelPosition,
          donut: cfg.donut,
          innerRadius: cfg.innerRadius,
          outerRadius: cfg.outerRadius,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'donut':
      return buildDonutChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          legendOrientation: cfg.legendOrientation,
          showLabels: cfg.showLabels,
          labelPosition: cfg.labelPosition,
          innerRadius: cfg.innerRadius,
          outerRadius: cfg.outerRadius,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'scatter':
      return buildScatterChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'heatmap':
      return buildHeatmapChartOptions({
        categories: data.categories ?? [],
        xAxisCategories: data.xAxisCategories ?? [],
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'radar':
      return buildRadarChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'treemap':
      return buildTreemapChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'sunburst':
      return buildSunburstChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'funnel':
      return buildFunnelChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'gauge':
      return buildGaugeChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          showLegend: cfg.showLegend,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    case 'geomap':
      return buildGeoMapChartOptions({
        categories: data.categories,
        series: data.series as any,
        visualConfig: {
          ...visualConfig,
          colorPalette: cfg.colorPalette,
        } as any,
      });

    // Fallback for other chart types - basic implementation
    case 'boxplot':
      return {
        tooltip: { trigger: 'axis' },
        color: cfg.colorPalette,
        xAxis: { type: 'category', data: data.categories },
        yAxis: { type: 'value' },
        series: data.series.map((s) => ({
          name: s.name,
          type: 'boxplot',
          data: s.data,
        })),
      };

    case 'graph':
      return {
        tooltip: { trigger: 'item' },
        color: cfg.colorPalette,
        series: [{
          type: 'graph',
          layout: 'force',
          data: data.series.map(s => ({ name: s.name, value: s.value, symbolSize: 30 })),
          force: { repulsion: 100 },
          label: { show: true }
        }]
      };

    case 'sankey':
      return {
        tooltip: { trigger: 'item' },
        color: cfg.colorPalette,
        series: [{
          type: 'sankey',
          emphasis: { focus: 'adjacency' },
          data: data.series.map(s => ({ name: s.name })),
          links: []
        }]
      };

    case 'parallel':
      return {
        tooltip: { trigger: 'item' },
        color: cfg.colorPalette,
        parallelAxis: data.categories?.map((c, i) => ({ dim: i, name: c })) || [],
        series: [{
          type: 'parallel',
          lineStyle: { width: 4 },
          data: data.series.map(s => s.data)
        }]
      };

    case 'pictorialBar':
      return {
        tooltip: { trigger: 'axis' },
        color: cfg.colorPalette,
        xAxis: { type: 'category', data: data.categories },
        yAxis: { type: 'value' },
        series: data.series.map(s => ({
          type: 'pictorialBar',
          symbol: 'roundRect',
          symbolRepeat: 'fixed',
          symbolMargin: '5%',
          symbolSize: 20,
          data: s.data
        }))
      };

    case 'calendar': {
      const calData = data.series[0]?.data || [];
      let maxVal = 0;
      let minYear = new Date().getFullYear();
      let maxYear = minYear;

      calData.forEach((item: any) => {
        const val = item[1];
        if (val > maxVal) maxVal = val;
        const year = parseInt(item[0].substring(0, 4));
        if (!isNaN(year)) {
          if (year < minYear) minYear = year;
          if (year > maxYear) maxYear = year;
        }
      });

      return {
        tooltip: { trigger: 'item' },
        color: cfg.colorPalette,
        visualMap: { min: 0, max: maxVal || 1000, type: 'continuous', orient: 'horizontal', left: 'center', top: 65, calculable: true },
        calendar: { top: 120, left: 30, right: 30, cellSize: ['auto', 13], range: maxYear.toString(), itemStyle: { borderWidth: 0.5 }, yearLabel: { show: true } },
        series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: calData }]
      };
    }

    case 'themeRiver':
      return {
        tooltip: { trigger: 'item' },
        color: cfg.colorPalette,
        singleAxis: { type: 'time', bottom: '10%', top: '10%' },
        series: [{
          type: 'themeRiver',
          data: data.series.flatMap((s: any) => s.data?.map((d: any, i: number) => [data.categories?.[i], d, s.name]) || []) as any
        }]
      };

    case 'custom':
      // Custom charts are now handled in a useEffect below to support timers/intervals safely
      return {};

    default:
      // Fallback to bar chart for basic types
      return {
        tooltip: { trigger: 'axis' },
        color: cfg.colorPalette,
        xAxis: { type: 'category', data: data.categories },
        yAxis: { type: 'value' },
        series: data.series.map((s) => ({
          name: s.name,
          type: 'bar',
          data: s.data,
        })),
      };
  }
}

const EChartWrapper: React.FC<EChartWrapperProps> = ({
  chartType,
  data,
  title,
  height = '400px',
  visualConfig,
  hideHeader = false,
  theme = 'default',
  drillStack = [],
  availableColumns = [],
  currentDimensionName = '',
  onDrillDown,
  onDrillUp,
  onDrillToLevel,
  onResetDrill,
  onFilterByValue,
  onExcludeValue,
}) => {
  // Refs to avoid stale closures in handleChartReady callback
  const onDrillDownRef = useRef(onDrillDown);
  const onFilterByValueRef = useRef(onFilterByValue);
  const onExcludeValueRef = useRef(onExcludeValue);
  const currentDimensionNameRef = useRef(currentDimensionName);
  const dataRef = useRef(data);
  const chartTypeRef = useRef(chartType);

  useEffect(() => {
    onDrillDownRef.current = onDrillDown;
    onFilterByValueRef.current = onFilterByValue;
    onExcludeValueRef.current = onExcludeValue;
    currentDimensionNameRef.current = currentDimensionName;
    dataRef.current = data;
    chartTypeRef.current = chartType;
  });

  // Drill context menu state
  const [drillMenu, setDrillMenu] = useState<{ x: number; y: number; info: DrillMenuClickInfo } | null>(null);
  const echartsRef = useRef<any>(null);
  const lastMouseCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Tracks the last element the pointer hovered over — used by non-Cartesian contextmenu
  const lastHoveredItem = useRef<{ categoryValue: string; dataValue: number | string; seriesName: string } | null>(null);
  const activeBrushSelectionRef = useRef<Set<string>>(new Set());
  const isPieMultiSelectModeRef = useRef<boolean>(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  const mapRegion = (visualConfig as any)?.map?.region || 'world';

  useEffect(() => {
    if (chartType === 'geomap') {
      if (echarts.getMap(mapRegion)) {
        setIsMapLoaded(true);
      } else {
        setIsMapLoaded(false);
        let url = 'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json';
        if (mapRegion === 'india') {
          url = 'https://raw.githubusercontent.com/adarshbiradar/maps-geojson/master/india.json';
        } else if (mapRegion !== 'world') {
          url = `https://raw.githubusercontent.com/adarshbiradar/maps-geojson/master/states/${mapRegion}.json`;
        }

        fetch(url)
          .then(res => res.json())
          .then(mapJson => {
            echarts.registerMap(mapRegion, mapJson);
            setIsMapLoaded(true);
          })
          .catch(err => {
            console.error(`Failed to load map data for ${mapRegion}:`, err);
            toast.error(`Failed to load map data for ${mapRegion}`);
          });
      }
    }
  }, [chartType, mapRegion]);

  const handleChartContextMenu = useCallback((e: React.MouseEvent) => {
    lastMouseCoords.current = { x: e.clientX, y: e.clientY };
    // Always suppress the native browser context menu on the chart container.
    // Our custom DrillContextMenu is shown via ECharts events instead.
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    lastMouseCoords.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Callback for React-based chart components (DataTable, Pivot, KPI)
  const handleReactChartContextMenu = useCallback((e: React.MouseEvent, cellValue: string | string[], colName: string) => {
    if (!onFilterByValueRef.current && !onDrillDownRef.current) return;
    e.preventDefault();
    setDrillMenu({
      x: e.clientX,
      y: e.clientY,
      info: {
        categoryValue: Array.isArray(cellValue) ? cellValue : String(cellValue),
        seriesName: String(colName),
        dataValue: '',
        dimensionName: colName || currentDimensionNameRef.current,
      },
    });
  }, []);

  const handleChartReady = useCallback((instance: any) => {
    if (!instance) return;
    echartsRef.current = instance;

    // Zr-level contextmenu: only for Cartesian charts (those with a grid)
    instance.getZr().off('contextmenu');
    if (CARTESIAN_CHART_TYPES.has(chartTypeRef.current)) {
      instance.getZr().on('contextmenu', (zrEvent: any) => {
        if (!onDrillDownRef.current && !onFilterByValueRef.current) return;
        zrEvent.event?.preventDefault?.();

        if (activeBrushSelectionRef.current.size > 0) {
          setDrillMenu({
            x: zrEvent.event?.clientX ?? lastMouseCoords.current.x,
            y: zrEvent.event?.clientY ?? lastMouseCoords.current.y,
            info: {
              categoryValue: Array.from(activeBrushSelectionRef.current),
              seriesName: 'Multiple series',
              dataValue: `${activeBrushSelectionRef.current.size} items`,
              dimensionName: currentDimensionNameRef.current,
            },
          });
          return;
        }

        const pointInPixel = [zrEvent.offsetX, zrEvent.offsetY];

        if (instance.containPixel && instance.containPixel('grid', pointInPixel)) {
          try {
            const opt = instance.getOption();
            const converted = instance.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
            if (converted && !isNaN(converted[0]) && !isNaN(converted[1])) {
              const xAxis = opt?.xAxis?.[0];
              const yAxis = opt?.yAxis?.[0];

              let categoryValue = '';
              let dataValue = 0;
              let seriesName = opt?.series?.[0]?.name || '';

              // Horizontal bar: Y-axis has categories; vertical: X-axis has categories
              const isHorizontal = yAxis && (yAxis.type === 'category' || (yAxis.data && yAxis.data.length > 0));

              if (isHorizontal) {
                const yIndex = Math.round(converted[1]);
                const yData = yAxis.data || dataRef.current.categories || [];
                if (yIndex >= 0 && yIndex < yData.length) {
                  categoryValue = String(yData[yIndex]);
                  const seriesData = opt?.series?.[0]?.data || [];
                  dataValue = seriesData[yIndex] ?? 0;
                }
              } else {
                const xIndex = Math.round(converted[0]);
                const xData = (xAxis && xAxis.data) || dataRef.current.categories || [];
                if (xIndex >= 0 && xIndex < xData.length) {
                  categoryValue = String(xData[xIndex]);
                  const seriesData = opt?.series?.[0]?.data || [];
                  dataValue = seriesData[xIndex] ?? 0;
                }
              }

              if (activeBrushSelectionRef.current.size > 0) {
                setDrillMenu({
                  x: zrEvent.event?.clientX ?? lastMouseCoords.current.x,
                  y: zrEvent.event?.clientY ?? lastMouseCoords.current.y,
                  info: {
                    categoryValue: Array.from(activeBrushSelectionRef.current),
                    seriesName: 'Multiple series',
                    dataValue: `${activeBrushSelectionRef.current.size} items`,
                    dimensionName: currentDimensionNameRef.current,
                  },
                });
                return;
              }

              if (categoryValue) {
                setDrillMenu({
                  x: zrEvent.event?.clientX ?? lastMouseCoords.current.x,
                  y: zrEvent.event?.clientY ?? lastMouseCoords.current.y,
                  info: {
                    categoryValue,
                    seriesName: String(seriesName),
                    dataValue,
                    dimensionName: currentDimensionNameRef.current,
                  },
                });
                return;
              }
            }
          } catch (err) {
            console.error('[EChartWrapper] Error in Zr contextmenu handler:', err);
          }
        }
      });
    } else {
      // For non-Cartesian charts (pie, donut, funnel, treemap, radar, sunburst etc.)
      // Strategy: track the last hovered data item via 'mouseover', then use it when
      // the Zr contextmenu fires. This is reliable because:
      //   - Tooltips already work → 'mouseover' fires correctly for every slice/segment
      //   - Right-click always follows a hover over the same element
      instance.off('mouseover');
      instance.on('mouseover', (params: any) => {
        if (params.name) {
          lastHoveredItem.current = {
            categoryValue: String(params.name),
            dataValue: params.value ?? params.data?.value ?? 0,
            seriesName: String(params.seriesName || ''),
          };
        }
      });

      instance.getZr().on('contextmenu', (zrEvent: any) => {
        zrEvent.event?.preventDefault?.();
        if (!onDrillDownRef.current && !onFilterByValueRef.current) return;

        if (activeBrushSelectionRef.current.size > 0) {
          setDrillMenu({
            x: zrEvent.event?.clientX ?? lastMouseCoords.current.x,
            y: zrEvent.event?.clientY ?? lastMouseCoords.current.y,
            info: {
              categoryValue: Array.from(activeBrushSelectionRef.current),
              seriesName: 'Multiple series',
              dataValue: `${activeBrushSelectionRef.current.size} items`,
              dimensionName: currentDimensionNameRef.current,
            },
          });
          return;
        }

        const item = lastHoveredItem.current;
        if (item && item.categoryValue) {
          setDrillMenu({
            x: zrEvent.event?.clientX ?? lastMouseCoords.current.x,
            y: zrEvent.event?.clientY ?? lastMouseCoords.current.y,
            info: {
              categoryValue: item.categoryValue,
              seriesName: item.seriesName,
              dataValue: item.dataValue,
              dimensionName: currentDimensionNameRef.current,
            },
          });
        }
      });
    }

    // ECharts element-level contextmenu — fires when pointer is precisely on a data element.
    // This gives a more accurate categoryValue than the Zr fallback above, so let it override.
    instance.off('contextmenu');
    instance.on('contextmenu', (params: any) => {
      if (!onDrillDownRef.current && !onFilterByValueRef.current) return;
      params.event?.event?.preventDefault?.();

      if (activeBrushSelectionRef.current.size > 0) {
        setDrillMenu({
          x: params.event?.event?.clientX ?? lastMouseCoords.current.x,
          y: params.event?.event?.clientY ?? lastMouseCoords.current.y,
          info: {
            categoryValue: Array.from(activeBrushSelectionRef.current),
            seriesName: 'Multiple series',
            dataValue: `${activeBrushSelectionRef.current.size} items`,
            dimensionName: currentDimensionNameRef.current,
          },
        });
        return;
      }

      let categoryValue = '';
      let seriesName = String(params.seriesName || '');
      let dataValue = params.value ?? params.data?.value ?? 0;

      if (params.name) {
        categoryValue = String(params.name);
      } else if (params.data?.name) {
        categoryValue = String(params.data.name);
      }

      if (categoryValue) {
        setDrillMenu({
          x: params.event?.event?.clientX ?? lastMouseCoords.current.x,
          y: params.event?.event?.clientY ?? lastMouseCoords.current.y,
          info: {
            categoryValue,
            seriesName,
            dataValue: typeof dataValue === 'object' ? JSON.stringify(dataValue) : dataValue,
            dimensionName: currentDimensionNameRef.current,
          },
        });
      }
    });

    // Update active selection during brushing
    instance.off('brushSelected');
    instance.on('brushSelected', (params: any) => {
      const selected = params.batch?.[0]?.selected || [];
      const areas = params.batch?.[0]?.areas || [];
      const categoriesToSelect = new Set<string>();

      // Check if areas gives us a lineX or rect selection (provides exact X-axis coordRanges)
      let usedAreas = false;
      areas.forEach((area: any) => {
        let xMin, xMax;
        if (area.brushType === 'lineX' && area.coordRange && area.coordRange.length === 2) {
          xMin = area.coordRange[0];
          xMax = area.coordRange[1];
        } else if (area.brushType === 'rect' && area.coordRange && area.coordRange.length === 2 && Array.isArray(area.coordRange[0])) {
          xMin = area.coordRange[0][0];
          xMax = area.coordRange[0][1];
        }

        if (xMin !== undefined && xMax !== undefined) {
          usedAreas = true;
          const opt = instance.getOption();
          const axisData = opt?.xAxis?.[0]?.data || dataRef.current.categories || [];
          
          const min = Math.max(0, Math.ceil(Math.min(xMin, xMax)));
          const max = Math.min(axisData.length - 1, Math.floor(Math.max(xMin, xMax)));
          
          for (let i = min; i <= max; i++) {
             if (axisData[i] !== undefined && axisData[i] !== null) {
               categoriesToSelect.add(String(axisData[i]));
             }
          }
        }
      });

      // Fallback to dataIndex for rect brushes (e.g. bar charts, scatter)
      if (!usedAreas) {
        selected.forEach((sel: any) => {
          if (sel.dataIndex && sel.dataIndex.length > 0) {
            const opt = instance.getOption();
            let axisData = opt?.xAxis?.[0]?.data || dataRef.current.categories || [];
            
            const yAxis = opt?.yAxis?.[0];
            const isHorizontal = yAxis && (yAxis.type === 'category' || (yAxis.data && yAxis.data.length > 0));
            if (isHorizontal) {
              axisData = yAxis.data || dataRef.current.categories || [];
            }

            sel.dataIndex.forEach((idx: number) => {
              if (axisData[idx] !== undefined && axisData[idx] !== null) {
                categoriesToSelect.add(String(axisData[idx]));
              }
            });
          }
        });
      }
      
      activeBrushSelectionRef.current = categoriesToSelect;
    });

    // Handle pie chart selection events (ECharts 5+)
    instance.off('selectchanged');
    instance.on('selectchanged', (params: any) => {
      // Don't interfere if it's a cartesian chart using brush
      if (CARTESIAN_CHART_TYPES.has(chartTypeRef.current)) return;

      const selected = params.selected || [];
      const categoriesToSelect = new Set<string>();
      const opt = instance.getOption();
      
      selected.forEach((sel: any) => {
        if (sel.dataIndex && sel.dataIndex.length > 0) {
           const seriesData = opt?.series?.[sel.seriesIndex || 0]?.data || [];
           sel.dataIndex.forEach((idx: number) => {
             const dataItem = seriesData[idx];
             if (dataItem && dataItem.name) {
               categoriesToSelect.add(String(dataItem.name));
             } else if (dataRef.current.categories && dataRef.current.categories[idx]) {
               categoriesToSelect.add(String(dataRef.current.categories[idx]));
             }
           });
        }
      });

      activeBrushSelectionRef.current = categoriesToSelect;
    });

    // Removed automatic click popup so pie chart multi-selection isn't interrupted.

    // Brush end event for menu popup
    instance.off('brushEnd');
    instance.on('brushEnd', () => {
      if (!onFilterByValueRef.current) return;
      if (activeBrushSelectionRef.current.size > 0) {
        setDrillMenu({
          x: lastMouseCoords.current.x,
          y: lastMouseCoords.current.y,
          info: {
            categoryValue: Array.from(activeBrushSelectionRef.current),
            seriesName: 'Multiple series',
            dataValue: `${activeBrushSelectionRef.current.size} items`,
            dimensionName: currentDimensionNameRef.current,
          },
        });
      }
    });
  }, []);
  // Fetch dynamic custom themes to apply dashboard theme settings
  const { data: dbThemes } = useQuery<any[]>({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await api.get('/api/themes/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const themeMeta = useMemo(() => {
    const baseMeta = getThemeMeta(theme);

    if (dbThemes && theme && theme !== 'default') {
      const normalizedTheme = theme.toLowerCase().replace(/\s+/g, '_');
      const foundTheme = dbThemes.find(t => {
        const tId = t.name.toLowerCase().replace(/\s+/g, '_');
        return tId === normalizedTheme || t.name === theme;
      });

      if (foundTheme) {
        const themeObj = foundTheme.config?.theme || foundTheme.config;
        if (themeObj) {
          const bg = themeObj.backgroundColor && themeObj.backgroundColor !== 'transparent' ? themeObj.backgroundColor : '#ffffff';

          // Local helper to calculate dark/light luminance
          const isDarkColor = (colorStr: string): boolean => {
            if (!colorStr || colorStr === 'transparent') return false;
            let hex = colorStr.trim().replace('#', '');
            if (hex.length === 3) {
              hex = hex.split('').map(c => c + c).join('');
            }
            if (hex.length !== 6) return false;
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return yiq < 128;
          };

          const isDark = themeObj.isDark || isDarkColor(bg);
          const textColor = themeObj.textStyle?.color || (isDark ? '#f3f4f6' : '#1e293b');
          const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
          const colors = themeObj.color || baseMeta.colors;

          return {
            background: bg,
            text: textColor,
            border: border,
            primary: colors[0] || baseMeta.primary,
            secondary: colors[1] || colors[0] || baseMeta.secondary,
            colors: colors,
            heading: themeObj.textStyle?.color || textColor
          };
        }
      }
    }

    return baseMeta;
  }, [theme, dbThemes]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle custom chart types with timers/intervals
  useEffect(() => {
    if (chartType === 'custom') {
      // Custom chart logic can be implemented here
      // This is a placeholder for custom chart rendering
    }
  }, [chartType, data, visualConfig]);

  const dataString = JSON.stringify(data);
  const visualConfigString = JSON.stringify(visualConfig);

  const mergedOption = useMemo(() => {
    try {
      const baseOpt = buildOption(chartType, data, title, visualConfig, theme, themeMeta);
      
      // Add brush to baseOpt if it's a Cartesian chart
      if (CARTESIAN_CHART_TYPES.has(chartType)) {
        baseOpt.brush = {
          toolbox: [],
          xAxisIndex: 'all',
          yAxisIndex: 'all',
        };
        // Note: we intentionally do NOT force toolbox.show = true here.
        // We trigger the brush programmatically from the DrillContextMenu.
      }

      // Post-process: convert sentinel values (__NULL__, __EMPTY__) to display labels
      // in axis data and series names so charts show '(No Value)' / '(Empty)'
      const opt: any = {
        ...baseOpt,
        backgroundColor: visualConfig?.backgroundColor || themeMeta?.background || '#fff',
      };

      // Convert axis category data sentinels to display-friendly labels
      const convertAxisData = (axis: any) => {
        if (!axis) return;
        const axes = Array.isArray(axis) ? axis : [axis];
        axes.forEach((a: any) => {
          if (a.data && Array.isArray(a.data)) {
            a.data = a.data.map((v: any) => displayCategoryValue(String(v)));
          }
        });
      };
      convertAxisData(opt.xAxis);
      convertAxisData(opt.yAxis);

      // Convert pie/donut/funnel/treemap/sunburst series data names
      if (opt.series && Array.isArray(opt.series)) {
        opt.series.forEach((s: any) => {
          if (s.data && Array.isArray(s.data)) {
            s.data.forEach((d: any) => {
              if (d && typeof d === 'object' && d.name) {
                d.name = displayCategoryValue(String(d.name));
              }
            });
          }
        });
      }

      return opt;
    } catch (err) {
      console.error('[EChartWrapper] buildOption failed:', err);
      // Return a minimal valid option so ECharts doesn't crash
      return {
        title: {
          text: 'Chart rendering error',
          subtext: err instanceof Error ? err.message : 'Unknown error',
          left: 'center',
          top: 'center',
          textStyle: { color: '#ef4444', fontSize: 14 },
          subtextStyle: { color: '#94a3b8', fontSize: 12 },
        },
        backgroundColor: visualConfig?.backgroundColor || themeMeta?.background || '#fff',
      };
    }
  }, [chartType, dataString, title, visualConfigString, theme, themeMeta]);

  // Render React-based chart components (not ECharts)
  if (chartType === 'table') {
    return (
      <>
        <div
          ref={containerRef}
          style={{
            height,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            containerType: 'size',
            backgroundColor: themeMeta?.background || 'transparent',
          }}
        >
          {!hideHeader && title && (
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                borderBottom: (visualConfig?.headerBorderBottom as any) || `1px solid ${themeMeta?.border || '#e2e8f0'}`,
              }}
            >
              <h3 style={{
                margin: 0,
                fontSize: `${(visualConfig?.general as any)?.titleFontSize || visualConfig?.headerFontSize || 14}px`,
                fontWeight: (visualConfig?.headerFontWeight as any) || 600,
                fontFamily: (visualConfig?.headerFontFamily as any) || 'inherit',
                color: themeMeta?.heading || themeMeta?.text || '#1e293b',
              }}>
                {title}
              </h3>
            </div>
          )}
          <div className="flex-1 w-full min-h-0">
            <DataTableChart
              categories={data.categories}
              dimensions={data.dimensions}
              series={data.series}
              visualConfig={visualConfig}
              themeMeta={themeMeta}
              onDrillContextMenu={handleReactChartContextMenu}
              onDrillDown={onDrillDown}
              onFilterByValue={onFilterByValue}
              onExcludeValue={onExcludeValue}
              availableColumns={availableColumns}
              currentDimensionName={currentDimensionName}
            />
          </div>
        </div>

        {/* Drill Context Menu for table */}
        {drillMenu && (
          <DrillContextMenu
            x={drillMenu.x}
            y={drillMenu.y}
            clickInfo={drillMenu.info}
            availableColumns={availableColumns}
            currentDimension={currentDimensionName}
            canDrillUp={(drillStack?.length ?? 0) > 0}
            onDrillDown={(targetCol) => {
              onDrillDown?.(drillMenu.info.dimensionName, targetCol, toSentinelValue(drillMenu.info.categoryValue));
            }}
            onDrillUp={() => onDrillUp?.()}
            onFilterByValue={() => {
              onFilterByValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
              if (echartsRef.current) echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
            onExcludeValue={() => {
              onExcludeValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
              if (echartsRef.current) echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
            onSelectMultipleValues={() => {
              if (echartsRef.current) {
                echartsRef.current.dispatchAction({
                  type: 'takeGlobalCursor',
                  key: 'brush',
                  brushOption: {
                    brushType: 'rect',
                    brushMode: 'single'
                  }
                });
              }
            }}
            onResetDrill={(drillStack?.length ?? 0) > 0 ? onResetDrill : undefined}
            onClose={() => {
              setDrillMenu(null);
              if (echartsRef.current) echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
          />
        )}
      </>
    );
  }

  if (chartType === 'pivot') {
    return (
      <>
        <div
          ref={containerRef}
          style={{
            height,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            containerType: 'size',
            backgroundColor: themeMeta?.background || 'transparent',
          }}
        >
          {!hideHeader && title && (
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                borderBottom: (visualConfig?.headerBorderBottom as any) || `1px solid ${themeMeta?.border || '#e2e8f0'}`,
              }}
            >
              <h3 style={{
                margin: 0,
                fontSize: `${(visualConfig?.general as any)?.titleFontSize || visualConfig?.headerFontSize || 14}px`,
                fontWeight: (visualConfig?.headerFontWeight as any) || 600,
                fontFamily: (visualConfig?.headerFontFamily as any) || 'inherit',
                color: themeMeta?.heading || themeMeta?.text || '#1e293b',
              }}>
                {title}
              </h3>
            </div>
          )}
          <div className="flex-1 w-full min-h-0">
            <PivotTableChart
              categories={data.categories}
              dimensions={data.dimensions}
              series={data.series}
              pivotData={data.pivotData}
              visualConfig={visualConfig}
              themeMeta={themeMeta}
              onDrillDown={onDrillDown}
              onFilterByValue={onFilterByValue}
              onExcludeValue={onExcludeValue}
              availableColumns={availableColumns}
              currentDimensionName={currentDimensionName}
            />
          </div>
        </div>

        {/* Drill Context Menu for pivot */}
        {drillMenu && (
          <DrillContextMenu
            x={drillMenu.x}
            y={drillMenu.y}
            clickInfo={drillMenu.info}
            availableColumns={availableColumns}
            currentDimension={currentDimensionName}
            canDrillUp={(drillStack?.length ?? 0) > 0}
            onDrillDown={(targetCol) => {
              onDrillDown?.(drillMenu.info.dimensionName, targetCol, toSentinelValue(drillMenu.info.categoryValue));
            }}
            onDrillUp={() => onDrillUp?.()}
            onFilterByValue={() => {
              onFilterByValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
              if (echartsRef.current) echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
            onExcludeValue={() => {
              onExcludeValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
              if (echartsRef.current) echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
            onSelectMultipleValues={() => {
              if (echartsRef.current) {
                echartsRef.current.dispatchAction({
                  type: 'takeGlobalCursor',
                  key: 'brush',
                  brushOption: {
                    brushType: 'rect',
                    brushMode: 'single'
                  }
                });
              }
            }}
            onResetDrill={(drillStack?.length ?? 0) > 0 ? onResetDrill : undefined}
            onClose={() => {
              setDrillMenu(null);
              if (echartsRef.current) echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
          />
        )}
      </>
    );
  }

  if (chartType === 'kpi' || chartType === 'multikpi') {
    return (
      <>
        <div
          ref={containerRef}
          style={{
            height,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            containerType: 'size',
            backgroundColor: themeMeta?.background || 'transparent',
          }}
        >
          {!hideHeader && title && (
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                borderBottom: (visualConfig?.headerBorderBottom as any) || `1px solid ${themeMeta?.border || '#e2e8f0'}`,
              }}
            >
              <h3 style={{
                margin: 0,
                fontSize: `${(visualConfig?.general as any)?.titleFontSize || visualConfig?.headerFontSize || 14}px`,
                fontWeight: (visualConfig?.headerFontWeight as any) || 600,
                fontFamily: (visualConfig?.headerFontFamily as any) || 'inherit',
                color: themeMeta?.heading || themeMeta?.text || '#1e293b',
              }}>
                {title}
              </h3>
            </div>
          )}
          <div className="flex-1 w-full min-h-0 flex items-center justify-center">
            {chartType === 'kpi' ? (
              <KPITileChart
                categories={data.categories}
                dimensions={data.dimensions}
                series={data.series}
                visualConfig={visualConfig}
                themeMeta={themeMeta}
                onDrillContextMenu={handleReactChartContextMenu}
              />
            ) : (
              <MultiKPITileChart
                dimensions={data.dimensions}
                series={data.series}
                visualConfig={visualConfig}
                themeMeta={themeMeta}
                onDrillContextMenu={handleReactChartContextMenu}
              />
            )}
          </div>
        </div>
        
        {/* Drill Context Menu for KPI */}
        {drillMenu && (
          <DrillContextMenu
            x={drillMenu.x}
            y={drillMenu.y}
            clickInfo={drillMenu.info}
            availableColumns={availableColumns}
            currentDimension={currentDimensionName}
            canDrillUp={(drillStack?.length ?? 0) > 0}
            onDrillDown={(targetCol) => {
              onDrillDown?.(drillMenu.info.dimensionName, targetCol, toSentinelValue(drillMenu.info.categoryValue));
            }}
            onDrillUp={() => onDrillUp?.()}
            onFilterByValue={() => {
              onFilterByValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
            }}
            onExcludeValue={() => {
              onExcludeValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
            }}
            onResetDrill={(drillStack?.length ?? 0) > 0 ? onResetDrill : undefined}
            onClose={() => setDrillMenu(null)}
          />
        )}
      </>
    );
  }

  if (!data || !data.series || data.series.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          containerType: 'size',
        }}
      >
        {!hideHeader && title && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              borderBottom: (visualConfig?.headerBorderBottom as any) || '1px solid #e2e8f0',
            }}
          >
            <h3 style={{
              margin: 0,
              fontSize: `${(visualConfig?.general as any)?.titleFontSize || visualConfig?.headerFontSize || 14}px`,
              fontWeight: (visualConfig?.headerFontWeight as any) || 600,
              fontFamily: (visualConfig?.headerFontFamily as any) || 'inherit',
              color: themeMeta?.heading || '#1e293b',
            }}>
              {title}
            </h3>
          </div>
        )}
        <div className="flex-1 w-full flex items-center justify-center min-h-0">
          <div
            className="flex flex-col items-center justify-center w-full h-full p-2 text-center overflow-hidden transition-colors duration-300 border-l-4"
            style={{
              borderColor: themeMeta?.primary || '#6366f1',
              backgroundColor: themeMeta?.background || '#ffffff',
            }}
          >
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full gap-1">
              <span
                className="uppercase tracking-[0.2em] w-full line-clamp-2 px-2"
                style={{
                  fontSize: visualConfig?.headingFontSize ? `${visualConfig.headingFontSize}px` : '12px',
                  fontWeight: (visualConfig?.headingFontWeight as any) || 700,
                  color: themeMeta?.secondary || '#64748b',
                }}
              >
                {title || 'Chart'}
              </span>
              <span
                className="tracking-tighter w-full px-2 break-all"
                style={{
                  fontSize: visualConfig?.valueFontSize ? `${visualConfig.valueFontSize}px` : '14px',
                  fontWeight: (visualConfig?.valueFontWeight as any) || 400,
                  color: themeMeta?.text || '#475569',
                }}
              >
                No data available
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={handleChartContextMenu}
      onMouseMove={handleMouseMove}
      style={{
        height,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        containerType: 'size',
        backgroundColor: theme !== 'default' ? themeMeta?.background : ((visualConfig?.backgroundColor as any) || 'transparent'),
        borderRadius: '8px'
      }}
    >
      {!hideHeader && title && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            borderBottom: (visualConfig?.headerBorderBottom as any) || `1px solid ${themeMeta?.border || '#e2e8f0'}`,
          }}
        >
          <h3 style={{
            margin: 0,
            fontSize: `${(visualConfig?.general as any)?.titleFontSize || visualConfig?.headerFontSize || 14}px`,
            fontWeight: (visualConfig?.headerFontWeight as any) || 600,
            fontFamily: (visualConfig?.headerFontFamily as any) || 'inherit',
            color: themeMeta?.heading || themeMeta?.text || '#1e293b',
          }}>
            {title}
          </h3>
        </div>
      )}

      {/* Drill Breadcrumbs moved to DashboardWidget (rendered in portal) */}

      <div className="flex-1 w-full flex items-center justify-center min-h-0">
        {chartType === 'geomap' && !isMapLoaded ? (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
             <span className="text-sm font-medium">Loading Map Data...</span>
          </div>
        ) : (
          <ReactECharts
            option={mergedOption}
            style={{ height: '100%', width: '100%' }}
            theme={theme && theme !== 'default' ? theme : undefined}
            notMerge={true}
            lazyUpdate={true}
            opts={{ renderer: 'canvas' }}
            onChartReady={handleChartReady}
          />
        )}
      </div>

      {/* Drill Context Menu */}
      {drillMenu && (
        <DrillContextMenu
          x={drillMenu.x}
          y={drillMenu.y}
          clickInfo={drillMenu.info}
          availableColumns={availableColumns}
          currentDimension={currentDimensionName}
          canDrillUp={drillStack.length > 0}
          onDrillDown={(targetCol) => {
            onDrillDown(drillMenu.info.dimensionName, targetCol, toSentinelValue(drillMenu.info.categoryValue));
          }}
          onDrillUp={() => onDrillUp?.()}
          onFilterByValue={() => {
            onFilterByValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
            isPieMultiSelectModeRef.current = false;
            activeBrushSelectionRef.current.clear();
            if (echartsRef.current) {
              echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
              if (!CARTESIAN_CHART_TYPES.has(chartTypeRef.current)) {
                echartsRef.current.dispatchAction({ type: 'unselect', seriesIndex: 0 });
              }
            }
          }}
          onExcludeValue={() => {
            onExcludeValue?.(drillMenu.info.dimensionName, toSentinelValue(drillMenu.info.categoryValue));
            isPieMultiSelectModeRef.current = false;
            activeBrushSelectionRef.current.clear();
            if (echartsRef.current) {
              echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
              if (!CARTESIAN_CHART_TYPES.has(chartTypeRef.current)) {
                echartsRef.current.dispatchAction({ type: 'unselect', seriesIndex: 0 });
              }
            }
          }}
          onSelectMultipleValues={() => {
            if (echartsRef.current) {
              if (!CARTESIAN_CHART_TYPES.has(chartTypeRef.current)) {
                 isPieMultiSelectModeRef.current = true;
                 toast.success("Multi-Select Mode ON: Click multiple pie slices to select them, then right-click your selection to filter!");
                 setDrillMenu(null);
                 return;
              }
              
              echartsRef.current.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {
                  brushType: chartTypeRef.current === 'line' || chartTypeRef.current === 'area' ? 'lineX' : 'rect',
                  brushMode: 'single'
                }
              });
            }
          }}
          onResetDrill={drillStack.length > 0 ? onResetDrill : undefined}
          onClose={() => {
            setDrillMenu(null);
            isPieMultiSelectModeRef.current = false;
            activeBrushSelectionRef.current.clear();
            if (echartsRef.current) {
               echartsRef.current.dispatchAction({ type: 'brush', command: 'clear', areas: [] });
               if (!CARTESIAN_CHART_TYPES.has(chartTypeRef.current)) {
                 echartsRef.current.dispatchAction({ type: 'unselect', seriesIndex: 0 });
               }
            }
          }}
        />
      )}
    </div>
  );
};

export default EChartWrapper;
