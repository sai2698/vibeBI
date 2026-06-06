import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface PictorialBarChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  visualConfig?: {
    x_axis?: {
      show?: boolean;
      title?: string;
      labelRotation?: number;
    };
    y_axis?: {
      show?: boolean;
      title?: string;
    };
    legend?: {
      show?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    pictorialBar?: {
      symbol?: string;
      symbolSize?: number;
      symbolRepeat?: boolean;
      symbolMargin?: number;
      barMode?: 'normal' | 'repeat';
      repeatGap?: number;
    };
  };
}

export const pictorialBarChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'pictorialBar',
  sections: [
    {
      id: 'x_axis',
      title: 'X Axis',
      icon: 'AlignHorizontalDistribute',
      defaultExpanded: true,
      fields: [
        {
          key: 'x_axis.show',
          label: 'Show Axis',
          type: 'boolean',
          defaultValue: true,
          description: 'Display X axis',
        },
        {
          key: 'x_axis.title',
          label: 'Axis Title',
          type: 'text',
          placeholder: 'Category',
          description: 'X axis title',
        },
        {
          key: 'x_axis.labelRotation',
          label: 'Label Rotation',
          type: 'range',
          min: 0,
          max: 90,
          step: 15,
          defaultValue: 0,
          description: 'Rotate X axis labels (degrees)',
        },
      ],
    },
    {
      id: 'y_axis',
      title: 'Y Axis',
      icon: 'AlignVerticalDistribute',
      defaultExpanded: true,
      fields: [
        {
          key: 'y_axis.show',
          label: 'Show Axis',
          type: 'boolean',
          defaultValue: true,
          description: 'Display Y axis',
        },
        {
          key: 'y_axis.title',
          label: 'Axis Title',
          type: 'text',
          placeholder: 'Value',
          description: 'Y axis title',
        },
      ],
    },
    {
      id: 'legend',
      title: 'Legend',
      icon: 'List',
      defaultExpanded: false,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display legend',
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
          defaultValue: 'top',
          description: 'Legend position',
        },
      ],
    },
    {
      id: 'pictorialBar',
      title: 'Pictorial Bar Settings',
      icon: 'Square',
      defaultExpanded: true,
      fields: [
        {
          key: 'pictorialBar.symbol',
          label: 'Symbol Type',
          type: 'select',
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Square', value: 'rect' },
            { label: 'Triangle', value: 'triangle' },
            { label: 'Diamond', value: 'diamond' },
            { label: 'Pin', value: 'pin' },
            { label: 'Arrow', value: 'arrow' },
          ],
          defaultValue: 'circle',
          description: 'Symbol shape for bars',
        },
        {
          key: 'pictorialBar.symbolSize',
          label: 'Symbol Size',
          type: 'number',
          defaultValue: 20,
          description: 'Base size of symbols',
        },
        {
          key: 'pictorialBar.symbolRepeat',
          label: 'Repeat Symbols',
          type: 'boolean',
          defaultValue: false,
          description: 'Repeat symbols to fill bar height',
        },
        {
          key: 'pictorialBar.symbolMargin',
          label: 'Symbol Margin',
          type: 'number',
          defaultValue: 2,
          description: 'Gap between repeated symbols',
        },
        {
          key: 'pictorialBar.barMode',
          label: 'Bar Mode',
          type: 'select',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Repeat', value: 'repeat' },
          ],
          defaultValue: 'normal',
          description: 'How to display bars',
        },
        {
          key: 'pictorialBar.repeatGap',
          label: 'Repeat Gap',
          type: 'number',
          defaultValue: 4,
          description: 'Gap between repeated symbols',
        },
      ],
    },
  ],
  defaultConfig: {
    x_axis: { show: true, title: 'Category', labelRotation: 0 },
    y_axis: { show: true, title: 'Value' },
    legend: { show: true, position: 'top' },
    pictorialBar: { symbol: 'circle', symbolSize: 20, symbolRepeat: false, symbolMargin: 2, barMode: 'normal', repeatGap: 4 },
  },
});

export function buildPictorialBarChartOptions({
  categories,
  series,
  visualConfig = {},
}: PictorialBarChartOptions): EChartsOption {
  const cfg = visualConfig;
  const symbol = getConfigValue(cfg, 'pictorialBar.symbol') ?? 'circle';
  const symbolSize = getConfigValue(cfg, 'pictorialBar.symbolSize') ?? 20;
  const symbolRepeat = getConfigValue(cfg, 'pictorialBar.symbolRepeat') ?? false;
  const symbolMargin = getConfigValue(cfg, 'pictorialBar.symbolMargin') ?? 2;

  // Transform data for pictorial bar
  const barData = series[0]?.data.map((value, idx) => {
    if (symbolRepeat) {
      // Create repeated symbols based on value
      const repeatCount = Math.max(1, Math.floor(value / 10));
      return {
        value,
        symbol: symbol,
        symbolSize: [symbolSize, symbolSize],
        symbolRepeat: true,
        symbolMargin: symbolMargin,
      };
    }
    return value;
  }) ?? [];

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params;
        return `${param.seriesName}<br/>${param.name}: ${param.value}`;
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      top: getConfigValue(cfg, 'legend.position') ?? 'top',
      data: series.map(s => s.name),
    },
    xAxis: {
      type: 'category',
      data: categories,
      show: getConfigValue(cfg, 'x_axis.show') ?? true,
      name: getConfigValue(cfg, 'x_axis.title'),
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: {
        rotate: getConfigValue(cfg, 'x_axis.labelRotation') ?? 0,
      },
    },
    yAxis: {
      type: 'value',
      show: getConfigValue(cfg, 'y_axis.show') ?? true,
      name: getConfigValue(cfg, 'y_axis.title'),
      nameLocation: 'middle',
      nameGap: 30,
    },
    series: [
      {
        name: series[0]?.name,
        type: 'pictorialBar',
        data: barData,
        symbol: symbol,
        symbolSize: symbolSize,
        symbolRepeat: symbolRepeat,
        symbolMargin: symbolMargin,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8b5cf6' },
            { offset: 1, color: '#6366f1' },
          ]),
        },
      },
    ],
  };
}
