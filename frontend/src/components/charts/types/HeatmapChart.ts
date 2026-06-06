import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface HeatmapChartOptions {
  categories: string[]; // Y-axis labels
  series: Array<{
    name: string;
    data: Array<[number, number, number]>; // [x, y, value]
  }>;
  xAxisCategories?: string[]; // X-axis labels
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
  categories,
  series,
  xAxisCategories = [],
  visualConfig = {},
}: HeatmapChartOptions): EChartsOption {
  const cfg = visualConfig;

  // Transform data into heatmap format
  const heatmapData = series.flatMap((s) => {
    return s.data.map(([x, y, value]) => [x, y, value]);
  });

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          const p = params[0];
          const x = xAxisCategories[p.data[0]] ?? p.data[0];
          const y = categories[p.data[1]] ?? p.data[1];
          return `${x} x ${y}: ${p.data[2]}`;
        }
        return '';
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      orient: 'vertical',
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 0 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
    },
    grid: {
      left: '8%',
      right: getConfigValue(cfg, 'legend.show') ?? true ? '12%' : '4%',
      bottom: '8%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xAxisCategories.length > 0 ? xAxisCategories : categories,
      splitArea: {
        show: true,
      },
      name: getConfigValue(cfg, 'x_axis.title'),
      axisLabel: {
        overflow: getConfigValue(cfg, 'x_axis.truncate') ? 'truncate' : 'break',
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
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
      min: 0,
      max: Math.max(...heatmapData.map((d) => d[2] as number)),
      inRange: {
        color: visualConfig?.colorPalette || ['#e0f2fe', '#0284c7'],
      },
    },
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: getConfigValue(cfg, 'heatmap.showLabel') ?? true,
          formatter: getConfigValue(cfg, 'heatmap.labelFormat') ?? '{c}',
        },
        itemStyle: {
          borderRadius: getConfigValue(cfg, 'heatmap.cellRadius') ?? 2,
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
