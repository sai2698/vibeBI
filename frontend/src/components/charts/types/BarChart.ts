import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { smartCompareCategories } from '../../../utils/chartUtils';
import {
  axisLabelFormatter,
  autoRotation,
  gridBottomForRotation,
} from '../../../utils/numberFormat';

type EChartsOption = echarts.EChartsOption;

interface BarChartOptions {
  categories?: string[];
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: {
    x_axis?: {
      title?: string;
      labelRotation?: number;
      truncate?: boolean;
      showGridLines?: boolean;
    };
    y_axis?: {
      title?: string;
      showGridLines?: boolean;
    };
    legend?: {
      show?: boolean;
      orientation?: 'horizontal' | 'vertical';
    };
    dataLabels?: {
      show?: boolean;
      position?: string;
    };
    bar?: {
      stacking?: boolean;
      barWidth?: number;
      orientation?: 'vertical' | 'horizontal';
    };
    dataZoom?: {
      show?: boolean;
      type?: 'slider' | 'inside';
      orient?: 'horizontal' | 'vertical';
    };
    toolbox?: {
      show?: boolean;
    };
    animation?: {
      duration?: number;
    };
    colorPalette?: string[];
  };
}

// Bar Chart Configuration Schema
export const barChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'bar',
  sections: [
    {
      id: 'x_axis',
      title: 'X-Axis',
      icon: 'MoveHorizontal',
      defaultExpanded: true,
      fields: [
        {
          key: 'x_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter X-axis title',
          description: 'Title displayed below the X-axis',
        },
        {
          key: 'x_axis.labelRotation',
          label: 'Label Rotation',
          type: 'range',
          min: 0,
          max: 90,
          step: 15,
          defaultValue: 0,
          description: 'Rotate X-axis labels (0-90 degrees)',
        },
        {
          key: 'x_axis.truncate',
          label: 'Truncate Long Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Truncate X-axis labels that are too long',
        },
        {
          key: 'x_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: false,
          description: 'Display background grid lines along X-axis',
        },
      ],
    },
    {
      id: 'y_axis',
      title: 'Y-Axis',
      icon: 'MoveVertical',
      defaultExpanded: true,
      fields: [
        {
          key: 'y_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter Y-axis title',
          description: 'Title displayed beside the Y-axis',
        },
        {
          key: 'y_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: true,
          description: 'Display background grid lines along Y-axis',
        },
      ],
    },
    {
      id: 'legend',
      title: 'Legend',
      icon: 'LayoutList',
      defaultExpanded: true,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display chart legend',
        },
        {
          key: 'legend.orientation',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ],
          defaultValue: 'horizontal',
          description: 'Legend orientation',
        },
      ],
    },
    {
      id: 'dataLabels',
      title: 'Data Labels',
      icon: 'Type',
      defaultExpanded: true,
      fields: [
        {
          key: 'dataLabels.show',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Display values on bars',
        },
        {
          key: 'dataLabels.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Inside', value: 'inside' },
            { label: 'Right', value: 'right' },
            { label: 'Left', value: 'left' },
            { label: 'Bottom', value: 'bottom' },
          ],
          defaultValue: 'top',
          description: 'Label position on bars',
        },
      ],
    },
    {
      id: 'bar',
      title: 'Bar Settings',
      icon: 'BarChart3',
      defaultExpanded: false,
      fields: [
        {
          key: 'bar.stacking',
          label: 'Stacked Bars',
          type: 'boolean',
          defaultValue: false,
          description: 'Stack multiple series on top of each other',
        },
        {
          key: 'bar.barWidth',
          label: 'Bar Width',
          type: 'range',
          min: 10,
          max: 100,
          step: 5,
          defaultValue: 40,
          description: 'Width of each bar in pixels',
        },
      ],
    },
    {
      id: 'dataZoom',
      title: 'Data Zoom & Scroll',
      icon: 'MoveHorizontal',
      defaultExpanded: false,
      fields: [
        {
          key: 'dataZoom.show',
          label: 'Enable Zoom/Scroll',
          type: 'boolean',
          defaultValue: false,
          description: 'Enable scrolling/zooming along axes',
        },
        {
          key: 'dataZoom.type',
          label: 'Zoom Type',
          type: 'select',
          options: [
            { label: 'Slider Scrollbar', value: 'slider' },
            { label: 'Inside Mouse/Touch', value: 'inside' },
          ],
          defaultValue: 'slider',
          description: 'Choose scrollbar or mouse zoom',
        },
        {
          key: 'dataZoom.orient',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal (X-axis)', value: 'horizontal' },
            { label: 'Vertical (Y-axis)', value: 'vertical' },
          ],
          defaultValue: 'horizontal',
          description: 'Direction of zoom/scroll',
        },
      ],
    },
    {
      id: 'toolbox',
      title: 'Toolbox Utilities',
      icon: 'LayoutList',
      defaultExpanded: false,
      fields: [
        {
          key: 'toolbox.show',
          label: 'Show Toolbox',
          type: 'boolean',
          defaultValue: false,
          description: 'Show utility bar (Save as image, restore, data view)',
        },
      ],
    },
    {
      id: 'animation',
      title: 'Animation Settings',
      icon: 'Type',
      defaultExpanded: false,
      fields: [
        {
          key: 'animation.duration',
          label: 'Animation Duration (ms)',
          type: 'range',
          min: 0,
          max: 5000,
          step: 250,
          defaultValue: 1000,
          description: 'Time taken for chart elements to animate (0 to disable)',
        },
      ],
    },
    {
      id: 'sorting',
      title: 'Sorting',
      icon: 'ArrowUpDown',
      defaultExpanded: false,
      fields: [
        {
          key: 'sorting.mode',
          label: 'Sort By',
          type: 'select',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Value (Ascending)', value: 'value_asc' },
            { label: 'Value (Descending)', value: 'value_desc' },
            { label: 'Category (A-Z)', value: 'category_asc' },
            { label: 'Category (Z-A)', value: 'category_desc' },
          ],
          defaultValue: 'none',
          description: 'Sort data points by value or category',
        },
      ],
    },
  ],
  defaultConfig: {
    x_axis: {
      title: '',
      labelRotation: 0,
      truncate: true,
      showGridLines: false,
    },
    y_axis: {
      title: '',
      showGridLines: true,
    },
    legend: {
      show: true,
      orientation: 'horizontal',
    },
    dataLabels: {
      show: true,
      position: 'top',
    },
    bar: {
      stacking: false,
      barWidth: 40,
    },
    dataZoom: {
      show: false,
      type: 'slider',
      orient: 'horizontal',
    },
    toolbox: {
      show: false,
    },
    animation: {
      duration: 1000,
    },
    sorting: {
      mode: 'none',
    },
  },
});

export function buildBarChartOptions({
  categories,
  series,
  visualConfig,
}: BarChartOptions): EChartsOption {
  const sortMode = getConfigValue(visualConfig, 'sorting.mode') || 'none';

  let displayCategories = categories ? [...categories] : [];
  let displaySeries = series ? series.map(s => ({ ...s, data: s.data ? [...s.data] : [] })) : [];

  if (sortMode !== 'none' && displayCategories.length > 0 && displaySeries.length > 0) {
    let indices = Array.from({ length: displayCategories.length }, (_, i) => i);

    indices.sort((a, b) => {
      if (sortMode.startsWith('value')) {
        let valA = Number(displaySeries[0]?.data?.[a]) || 0;
        let valB = Number(displaySeries[0]?.data?.[b]) || 0;
        if (valA === valB) return 0;
        return sortMode === 'value_asc' ? valA - valB : valB - valA;
      } else if (sortMode.startsWith('category')) {
        let catA = String(displayCategories[a]);
        let catB = String(displayCategories[b]);
        const cmp = smartCompareCategories(catA, catB);
        return sortMode === 'category_asc' ? cmp : -cmp;
      }
      return 0;
    });

    displayCategories = indices.map(i => categories![i]);
    displaySeries = series.map(s => ({
      ...s,
      data: s.data ? indices.map(i => s.data![i]) : [],
    }));
  }

  const cfg = {
    xAxisTitle: getConfigValue(visualConfig, 'x_axis.title'),
    xAxisRotation: getConfigValue(visualConfig, 'x_axis.labelRotation') || 0,
    xAxisTruncate: getConfigValue(visualConfig, 'x_axis.truncate') !== false,
    xAxisShowGridLines: getConfigValue(visualConfig, 'x_axis.showGridLines') === true,
    yAxisTitle: getConfigValue(visualConfig, 'y_axis.title'),
    yAxisShowGridLines: getConfigValue(visualConfig, 'y_axis.showGridLines') !== false,
    showLegend: getConfigValue(visualConfig, 'legend.show') !== false,
    legendOrientation: getConfigValue(visualConfig, 'legend.orientation') || 'horizontal',
    showLabels: getConfigValue(visualConfig, 'dataLabels.show') !== false,
    labelPosition: getConfigValue(visualConfig, 'dataLabels.position') || 'top',
    stacking: getConfigValue(visualConfig, 'bar.stacking') === true,
    barWidth: getConfigValue(visualConfig, 'bar.barWidth') || 40,
    barOrientation: getConfigValue(visualConfig, 'bar.orientation') || 'vertical',
    dataZoomShow: getConfigValue(visualConfig, 'dataZoom.show') === true,
    dataZoomType: getConfigValue(visualConfig, 'dataZoom.type') || 'slider',
    dataZoomOrient: getConfigValue(visualConfig, 'dataZoom.orient') || 'horizontal',
    toolboxShow: getConfigValue(visualConfig, 'toolbox.show') === true,
    animationDuration: getConfigValue(visualConfig, 'animation.duration') ?? 1000,
    colorPalette: visualConfig?.colorPalette,
  };

  const colors = cfg.colorPalette;
  const showLegend = cfg.showLegend;
  const isHorizontal = cfg.barOrientation === 'horizontal';

  // Category axis mapping (used for labels/categories)
  const categoryAxis: any = {
    type: 'category',
    data: displayCategories,
    name: isHorizontal ? cfg.yAxisTitle || undefined : cfg.xAxisTitle || undefined,
    nameLocation: 'middle',
    nameGap: 35,
    nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
    axisLabel: {
      rotate: cfg.xAxisRotation,
      truncate: cfg.xAxisTruncate,
    },
    splitLine: {
      show: isHorizontal ? cfg.yAxisShowGridLines : cfg.xAxisShowGridLines,
    },
  };

  // Value axis mapping
  const valueAxis: any = {
    type: 'value',
    name: isHorizontal ? cfg.xAxisTitle || undefined : cfg.yAxisTitle || undefined,
    nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b', align: isHorizontal ? 'center' : 'right' },
    splitLine: {
      show: isHorizontal ? cfg.xAxisShowGridLines : cfg.yAxisShowGridLines,
    },
  };

  // Smart rotation: auto-pick based on category count unless user overrode
  const effectiveRotation = autoRotation(displayCategories.length, cfg.xAxisRotation || null);
  const gridBottom = gridBottomForRotation(isHorizontal ? 0 : effectiveRotation, showLegend);

  // Override category axis label with smart rotation + truncation
  categoryAxis.axisLabel = {
    rotate: isHorizontal ? 0 : effectiveRotation,
    overflow: 'truncate',
    width: effectiveRotation > 0 ? 80 : 120,
    interval: 'auto',
    hideOverlap: true,
  };

  // Override value axis label formatter for compact K/M/B/T
  valueAxis.axisLabel = {
    formatter: axisLabelFormatter,
    hideOverlap: true,
  };
  // Enough left margin so formatted labels like "1.25B" don't get clipped
  valueAxis.nameGap = isHorizontal ? 40 : 45;

  return {
    tooltip: {
      trigger: 'axis',
      confine: true,
    },
    color: colors,
    animationDuration: cfg.animationDuration,
    toolbox: {
      show: cfg.toolboxShow,
      feature: {
        saveAsImage: { show: true },
        dataView: { show: true, readOnly: false },
        restore: { show: true },
      },
    },
    dataZoom: cfg.dataZoomShow ? [
      {
        show: true,
        type: cfg.dataZoomType as 'slider' | 'inside',
        orient: cfg.dataZoomOrient as 'horizontal' | 'vertical',
        xAxisIndex: cfg.dataZoomOrient === 'horizontal' ? [0] : undefined,
        yAxisIndex: cfg.dataZoomOrient === 'vertical' ? [0] : undefined,
      }
    ] : undefined,
    legend: {
      show: showLegend,
      bottom: 0,
      orient: cfg.legendOrientation,
      type: 'scroll',
      pageIconSize: 10,
    },
    grid: {
      left: isHorizontal ? '4%' : '3%',
      right: '4%',
      bottom: gridBottom,
      top: cfg.toolboxShow ? '14%' : '8%',
      containLabel: true,
    },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    series: displaySeries.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data || [],
      stack: cfg.stacking ? 'total' : undefined,
      label: {
        show: cfg.showLabels,
        position: cfg.labelPosition as any,
        formatter: (p: any) => {
          const v = typeof p.value === 'object' ? (p.value?.[1] ?? p.value?.[0]) : p.value;
          return axisLabelFormatter(Number(v));
        },
      },
      barMaxWidth: cfg.barWidth,
      itemStyle: { borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
    })),
  };
}
