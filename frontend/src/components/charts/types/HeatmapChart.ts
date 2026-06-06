import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface HeatmapChartOptions {
  categories: string[]; // Y-axis labels (row dimension values)
  series: Array<{
    name: string;
    data: Array<[number, number, number]>; // [xIndex, yIndex, value]
  }>;
  xAxisCategories?: string[]; // X-axis labels (column dimension values)
  visualConfig?: {
    x_axis?: {
      title?: string;
      truncate?: boolean;
    };
    y_axis?: {
      title?: string;
      truncate?: boolean;
    };
    legend?: {
      show?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    heatmap?: {
      showLabel?: boolean;
      labelFormat?: string;
      cellRadius?: number;
    };
    colorPalette?: string[];
  };
}

export const heatmapChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'heatmap',
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
          key: 'x_axis.truncate',
          label: 'Truncate Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Truncate long X-axis labels',
        },
      ],
    },
    {
      id: 'y_axis',
      title: 'Y-Axis',
      icon: 'MoveVertical',
      defaultExpanded: false,
      fields: [
        {
          key: 'y_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter Y-axis title',
          description: 'Title displayed beside the Y-axis',
        },
        {
          key: 'y_axis.truncate',
          label: 'Truncate Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Truncate long Y-axis labels',
        },
      ],
    },
    {
      id: 'legend',
      title: 'Legend',
      icon: 'LayoutList',
      defaultExpanded: false,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display color scale legend',
        },
        {
          key: 'legend.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ],
          defaultValue: 'right',
          description: 'Legend position on the chart',
        },
      ],
    },
    {
      id: 'heatmap',
      title: 'Heatmap Settings',
      icon: 'Grid3x3',
      defaultExpanded: false,
      fields: [
        {
          key: 'heatmap.showLabel',
          label: 'Show Cell Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Display values inside cells',
        },
        {
          key: 'heatmap.labelFormat',
          label: 'Label Format',
          type: 'text',
          placeholder: '{c}',
          description: 'Template: {c} for value',
        },
        {
          key: 'heatmap.cellRadius',
          label: 'Cell Radius',
          type: 'range',
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 2,
          description: 'Corner radius of cells (0-10)',
        },
      ],
    },
  ],
  defaultConfig: {
    x_axis: { title: '', truncate: true },
    y_axis: { title: '', truncate: true },
    legend: { show: true, position: 'right' },
    heatmap: { showLabel: true, labelFormat: '{c}', cellRadius: 2 },
  },
});

export function buildHeatmapChartOptions({
  categories = [],
  series = [],
  xAxisCategories = [],
  visualConfig = {},
}: HeatmapChartOptions): EChartsOption {
  const cfg = visualConfig;

  // Collect all heatmap data points from all series
  const heatmapData = series.flatMap((s) => {
    if (!s.data || !Array.isArray(s.data)) return [];
    return s.data.map(item => {
      // Handle both array-style [x, y, val] and possible object-style
      if (Array.isArray(item) && item.length >= 3) {
        return [item[0], item[1], item[2]];
      }
      return item;
    });
  });

  // Use xAxisCategories for X-axis; fallback to categories if not provided
  const xLabels = xAxisCategories.length > 0 ? xAxisCategories : categories;
  const yLabels = categories;

  // Safely compute max value (guard against empty arrays)
  const numericValues = heatmapData
    .map(d => (Array.isArray(d) ? Number(d[2]) : 0))
    .filter(v => !isNaN(v) && isFinite(v));
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 1;
  const minVal = numericValues.length > 0 ? Math.min(...numericValues) : 0;

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        if (!p || !p.data) return '';
        const xIdx = p.data[0];
        const yIdx = p.data[1];
        const val = p.data[2];
        const xLabel = xLabels[xIdx] ?? xIdx;
        const yLabel = yLabels[yIdx] ?? yIdx;
        return `<div style="font-size:12px">
          <strong>${yLabel}</strong> × <strong>${xLabel}</strong><br/>
          Value: <strong>${val != null ? val : '—'}</strong>
        </div>`;
      },
    },
    grid: {
      left: '8%',
      right: getConfigValue(cfg, 'legend.show') ?? true ? '12%' : '4%',
      bottom: '15%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      splitArea: {
        show: true,
      },
      name: getConfigValue(cfg, 'x_axis.title'),
      axisLabel: {
        overflow: getConfigValue(cfg, 'x_axis.truncate') ? 'truncate' : 'break',
        rotate: xLabels.length > 10 ? 30 : 0,
      },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      splitArea: {
        show: true,
      },
      name: getConfigValue(cfg, 'y_axis.title'),
      axisLabel: {
        overflow: getConfigValue(cfg, 'y_axis.truncate') ? 'truncate' : 'break',
      },
    },
    visualMap: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      min: minVal,
      max: maxVal,
      inRange: {
        color: visualConfig?.colorPalette?.length >= 2
          ? [visualConfig.colorPalette[0], visualConfig.colorPalette[visualConfig.colorPalette.length - 1]]
          : ['#e0f2fe', '#0284c7'],
      },
    },
    series: [
      {
        name: series[0]?.name || 'Heatmap',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: getConfigValue(cfg, 'heatmap.showLabel') ?? true,
          formatter: getConfigValue(cfg, 'heatmap.labelFormat') ?? '{c}',
          fontSize: 10,
        },
        itemStyle: {
          borderRadius: getConfigValue(cfg, 'heatmap.cellRadius') ?? 2,
          borderColor: '#fff',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}
