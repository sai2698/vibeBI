import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface GaugeChartOptions {
  categories: string[]; // Not typically used for gauge
  series: Array<{
    name: string;
    data: number[];
  }>;
  visualConfig?: {
    dataLabels?: {
      show?: boolean;
      formatter?: string;
      fontSize?: number;
    };
    gauge?: {
      min?: number;
      max?: number;
      startAngle?: number;
      endAngle?: number;
      showTick?: boolean;
      showSplitLine?: boolean;
      progress?: {
        show?: boolean;
        width?: number;
      };
      pointer?: {
        show?: boolean;
        length?: string;
      };
    };
    colorPalette?: string[];
  };
}

export const gaugeChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'gauge',
  sections: [
    {
      id: 'dataLabels',
      title: 'Data Labels',
      icon: 'Tag',
      defaultExpanded: true,
      fields: [
        {
          key: 'dataLabels.show',
          label: 'Show Value',
          type: 'boolean',
          defaultValue: true,
          description: 'Display current value in center',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{value}',
          description: 'Template for value display',
        },
        {
          key: 'dataLabels.fontSize',
          label: 'Font Size',
          type: 'number',
          defaultValue: 20,
          description: 'Font size for value display',
        },
      ],
    },
    {
      id: 'gauge',
      title: 'Gauge Settings',
      icon: 'Gauge',
      defaultExpanded: false,
      fields: [
        {
          key: 'gauge.min',
          label: 'Minimum Value',
          type: 'number',
          defaultValue: 0,
          description: 'Minimum value on gauge scale',
        },
        {
          key: 'gauge.max',
          label: 'Maximum Value',
          type: 'number',
          defaultValue: 100,
          description: 'Maximum value on gauge scale',
        },
        {
          key: 'gauge.startAngle',
          label: 'Start Angle',
          type: 'range',
          min: 0,
          max: 270,
          step: 15,
          defaultValue: 225,
          description: 'Starting angle of gauge (degrees)',
        },
        {
          key: 'gauge.endAngle',
          label: 'End Angle',
          type: 'range',
          min: 90,
          max: 360,
          step: 15,
          defaultValue: -45,
          description: 'Ending angle of gauge (degrees)',
        },
        {
          key: 'gauge.showTick',
          label: 'Show Ticks',
          type: 'boolean',
          defaultValue: true,
          description: 'Display tick marks on gauge',
        },
        {
          key: 'gauge.showSplitLine',
          label: 'Show Split Lines',
          type: 'boolean',
          defaultValue: true,
          description: 'Display split lines on gauge',
        },
      ],
    },
    {
      id: 'progress',
      title: 'Progress Settings',
      icon: 'CircleProgress',
      defaultExpanded: false,
      fields: [
        {
          key: 'gauge.progress.show',
          label: 'Show Progress',
          type: 'boolean',
          defaultValue: true,
          description: 'Display colored progress bar',
        },
        {
          key: 'gauge.progress.width',
          label: 'Progress Width',
          type: 'range',
          min: 5,
          max: 30,
          step: 1,
          defaultValue: 10,
          description: 'Width of progress bar (px)',
        },
      ],
    },
    {
      id: 'pointer',
      title: 'Pointer Settings',
      icon: 'Crosshair',
      defaultExpanded: false,
      fields: [
        {
          key: 'gauge.pointer.show',
          label: 'Show Pointer',
          type: 'boolean',
          defaultValue: true,
          description: 'Display pointer needle',
        },
        {
          key: 'gauge.pointer.length',
          label: 'Pointer Length',
          type: 'text',
          defaultValue: '85%',
          description: 'Length of pointer as percentage',
        },
      ],
    },
  ],
  defaultConfig: {
    dataLabels: { show: true, formatter: '{value}', fontSize: 20 },
    gauge: { min: 0, max: 100, startAngle: 225, endAngle: -45, showTick: true, showSplitLine: true },
    progress: { show: true, width: 10 },
    pointer: { show: true, length: '85%' },
  },
});

export function buildGaugeChartOptions({
  categories: _categories,
  series,
  visualConfig = {},
}: GaugeChartOptions): EChartsOption {
  const cfg = visualConfig;
  const colors = visualConfig?.colorPalette;

  const value = series[0]?.data[0] ?? 0;

  return {
    tooltip: {
      formatter: (_params: any) => {
        return `${series[0]?.name ?? 'Value'}: ${value}`;
      },
    },
    series: [
      {
        type: 'gauge',
        min: getConfigValue(cfg, 'gauge.min') ?? 0,
        max: getConfigValue(cfg, 'gauge.max') ?? 100,
        startAngle: getConfigValue(cfg, 'gauge.startAngle') ?? 225,
        endAngle: getConfigValue(cfg, 'gauge.endAngle') ?? -45,
        progress: {
          show: getConfigValue(cfg, 'gauge.progress.show') ?? true,
          width: getConfigValue(cfg, 'gauge.progress.width') ?? 10,
          itemStyle: {
            color: colors?.[0] || '#3b82f6',
          },
        },
        pointer: {
          show: getConfigValue(cfg, 'gauge.pointer.show') ?? true,
          length: getConfigValue(cfg, 'gauge.pointer.length') ?? '85%',
        },
        axisLine: {
          lineStyle: {
            width: getConfigValue(cfg, 'gauge.progress.width') ?? 10,
            color: [
              [0.3, '#ef4444'],
              [0.7, '#eab308'],
              [1, '#22c55e'],
            ],
          },
        },
        axisTick: {
          show: getConfigValue(cfg, 'gauge.showTick') ?? true,
          splitNumber: 5,
          lineStyle: {
            color: '#94a3b8',
            width: 1,
          },
        },
        splitLine: {
          show: getConfigValue(cfg, 'gauge.showSplitLine') ?? true,
          length: 10,
          lineStyle: {
            color: '#94a3b8',
            width: 2,
          },
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          distance: 15,
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 15,
          itemStyle: {
            borderWidth: 5,
            borderColor: colors?.[0] || '#3b82f6',
          },
        },
        title: {
          show: true,
          offsetCenter: [0, '70%'],
          fontSize: 12,
          color: '#64748b',
        },
        detail: {
          valueAnimation: true,
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          fontSize: getConfigValue(cfg, 'dataLabels.fontSize') ?? 20,
          color: '#1e293b',
          offsetCenter: [0, '40%'],
          formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{value}',
        },
        data: [
          {
            value: value,
            name: series[0]?.name ?? '',
          },
        ],
      },
    ],
  };
}
