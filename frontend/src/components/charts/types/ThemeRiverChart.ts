import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface ThemeRiverChartOptions {
  categories: string[]; // Time-based categories
  series: Array<{
    name: string;
    data: Array<[string, string, number]>; // [date, category, value]
  }>;
  visualConfig?: {
    x_axis?: {
      show?: boolean;
      title?: string;
      type?: 'time' | 'category';
      dateFormat?: string;
    };
    y_axis?: {
      show?: boolean;
      title?: string;
    };
    legend?: {
      show?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    themeRiver?: {
      stacking?: boolean;
      layerOpacity?: number;
      colorPalette?: string[];
      smooth?: boolean;
      labelShow?: boolean;
    };
  };
}

export const themeRiverChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'themeRiver',
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
          placeholder: 'Time',
          description: 'X axis title',
        },
        {
          key: 'x_axis.type',
          label: 'Axis Type',
          type: 'select',
          options: [
            { label: 'Time', value: 'time' },
            { label: 'Category', value: 'category' },
          ],
          defaultValue: 'time',
          description: 'Type of X axis',
        },
        {
          key: 'x_axis.dateFormat',
          label: 'Date Format',
          type: 'text',
          placeholder: 'MM/DD/YYYY',
          description: 'Date format for time axis',
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
          placeholder: 'Magnitude',
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
      id: 'themeRiver',
      title: 'ThemeRiver Settings',
      icon: 'waves',
      defaultExpanded: true,
      fields: [
        {
          key: 'themeRiver.stacking',
          label: 'Stack Layers',
          type: 'boolean',
          defaultValue: true,
          description: 'Stack theme layers on top of each other',
        },
        {
          key: 'themeRiver.layerOpacity',
          label: 'Layer Opacity',
          type: 'range',
          min: 0.1,
          max: 1,
          step: 0.1,
          defaultValue: 0.8,
          description: 'Opacity of each layer',
        },
        {
          key: 'themeRiver.smooth',
          label: 'Smooth Curves',
          type: 'boolean',
          defaultValue: true,
          description: 'Use smooth curves instead of straight lines',
        },
        {
          key: 'themeRiver.labelShow',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Display labels on each layer',
        },
        {
          key: 'themeRiver.colorPalette',
          label: 'Color Palette',
          type: 'select',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Warm', value: 'warm' },
            { label: 'Cool', value: 'cool' },
            { label: 'Rainbow', value: 'rainbow' },
          ],
          defaultValue: 'default',
          description: 'Color scheme for layers',
        },
      ],
    },
  ],
  defaultConfig: {
    x_axis: { show: true, title: 'Time', type: 'time', dateFormat: 'MM/DD/YYYY' },
    y_axis: { show: true, title: 'Magnitude' },
    legend: { show: true, position: 'top' },
    themeRiver: { stacking: true, layerOpacity: 0.8, smooth: true, labelShow: false, colorPalette: 'default' },
  },
});

export function buildThemeRiverChartOptions({
  categories,
  series,
  visualConfig = {},
}: ThemeRiverChartOptions): EChartsOption {
  const cfg = visualConfig;
  
  // ThemeRiver uses special data format: [timestamp, singleValue, itemName]
  const themeRiverData: Array<[number, number, string]> = [];
  
  series.forEach((serie, serieIdx) => {
    serie.data.forEach(item => {
      // Convert date string to timestamp
      const date = new Date(item[0]);
      const value = item[2];
      themeRiverData.push([date.getTime(), value, serie.name]);
    });
  });

  // Sort by date
  themeRiverData.sort((a, b) => a[0] - b[0]);

  const colorPalettes: Record<string, string[]> = {
    default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
    warm: ['#ff6b6b', '#feca57', '#ff9f43', '#ee5a24', '#c44d36'],
    cool: ['#54a0ff', '#5f27cd', '#48dbfb', '#0abde3', '#10ac84'],
    rainbow: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'],
  };

  const colors = colorPalettes[getConfigValue(cfg, 'themeRiver.colorPalette') ?? 'default'];

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
      },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        const param = params[0];
        const date = new Date(param.value[0]).toLocaleDateString();
        return `${date}<br/>${param.seriesName}: ${param.value[1]}`;
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      top: getConfigValue(cfg, 'legend.position') ?? 'top',
      data: series.map(s => s.name),
    },
    xAxis: {
      type: 'time',
      show: getConfigValue(cfg, 'x_axis.show') ?? true,
      name: getConfigValue(cfg, 'x_axis.title'),
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: {
        formatter: getConfigValue(cfg, 'x_axis.dateFormat') ?? 'MM/DD',
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
        type: 'themeRiver',
        data: themeRiverData,
        label: {
          show: getConfigValue(cfg, 'themeRiver.labelShow') ?? false,
        },
        areaStyle: {
          opacity: getConfigValue(cfg, 'themeRiver.layerOpacity') ?? 0.8,
        },
        smooth: getConfigValue(cfg, 'themeRiver.smooth') ?? true,
        itemStyle: {
          color: function(param: any) {
            const idx = series.findIndex(s => s.name === param.name);
            return colors[idx % colors.length];
          },
        },
      },
    ],
  };
}
