import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface CalendarChartOptions {
  categories: string[]; // Not typically used for calendar
  series: Array<{
    name: string;
    data: Array<[string, number]>; // [date, value]
  }>;
  visualConfig?: {
    calendar?: {
      startDate?: string;
      endDate?: string;
      yearPosition?: 'left' | 'right' | 'top' | 'bottom' | 'none';
      monthPosition?: 'left' | 'right' | 'top' | 'bottom' | 'none';
      cellSize?: number | [number, number];
      range?: 'year' | 'month' | 'day';
      showBorder?: boolean;
      splitLineShow?: boolean;
    };
    dataLabels?: {
      show?: boolean;
      formatter?: string;
      fontSize?: number;
      color?: string;
    };
    legend?: {
      show?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    visualMap?: {
      show?: boolean;
      min?: number;
      max?: number;
      calculable?: boolean;
      orient?: 'horizontal' | 'vertical';
      inRangeColor?: string[];
    };
  };
}

export const calendarChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'calendar',
  sections: [
    {
      id: 'calendar',
      title: 'Calendar Settings',
      icon: 'Calendar',
      defaultExpanded: true,
      fields: [
        {
          key: 'calendar.startDate',
          label: 'Start Date',
          type: 'text',
          placeholder: '2024-01-01',
          description: 'Start date (YYYY-MM-DD)',
        },
        {
          key: 'calendar.endDate',
          label: 'End Date',
          type: 'text',
          placeholder: '2024-12-31',
          description: 'End date (YYYY-MM-DD)',
        },
        {
          key: 'calendar.yearPosition',
          label: 'Year Position',
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Hidden', value: 'none' },
          ],
          defaultValue: 'left',
          description: 'Position of year label',
        },
        {
          key: 'calendar.monthPosition',
          label: 'Month Position',
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Hidden', value: 'none' },
          ],
          defaultValue: 'top',
          description: 'Position of month label',
        },
        {
          key: 'calendar.cellSize',
          label: 'Cell Size',
          type: 'number',
          defaultValue: 15,
          description: 'Size of each calendar cell (px)',
        },
        {
          key: 'calendar.range',
          label: 'Range Type',
          type: 'select',
          options: [
            { label: 'Year', value: 'year' },
            { label: 'Month', value: 'month' },
            { label: 'Day', value: 'day' },
          ],
          defaultValue: 'year',
          description: 'Calendar range granularity',
        },
        {
          key: 'calendar.showBorder',
          label: 'Show Border',
          type: 'boolean',
          defaultValue: true,
          description: 'Show border around calendar',
        },
        {
          key: 'calendar.splitLineShow',
          label: 'Show Split Lines',
          type: 'boolean',
          defaultValue: true,
          description: 'Show grid lines between cells',
        },
      ],
    },
    {
      id: 'dataLabels',
      title: 'Data Labels',
      icon: 'Type',
      defaultExpanded: false,
      fields: [
        {
          key: 'dataLabels.show',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Display values in cells',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{c}',
          description: 'Template: {c} for value',
        },
        {
          key: 'dataLabels.fontSize',
          label: 'Font Size',
          type: 'number',
          defaultValue: 10,
          description: 'Label font size',
        },
        {
          key: 'dataLabels.color',
          label: 'Color',
          type: 'color',
          defaultValue: '#ffffff',
          description: 'Label color',
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
          defaultValue: false,
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
          defaultValue: 'bottom',
          description: 'Legend position',
        },
      ],
    },
    {
      id: 'visualMap',
      title: 'Visual Map',
      icon: 'Palette',
      defaultExpanded: true,
      fields: [
        {
          key: 'visualMap.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Show visual map legend',
        },
        {
          key: 'visualMap.min',
          label: 'Minimum Value',
          type: 'number',
          defaultValue: 0,
          description: 'Minimum value for color scale',
        },
        {
          key: 'visualMap.max',
          label: 'Maximum Value',
          type: 'number',
          defaultValue: 100,
          description: 'Maximum value for color scale',
        },
        {
          key: 'visualMap.calculable',
          label: 'Calculable',
          type: 'boolean',
          defaultValue: false,
          description: 'Allow dragging to set values',
        },
        {
          key: 'visualMap.orient',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ],
          defaultValue: 'horizontal',
          description: 'Visual map orientation',
        },
        {
          key: 'visualMap.inRangeColor',
          label: 'Color Range',
          type: 'select',
          options: [
            { label: 'Heat', value: 'heat' },
            { label: 'Blue-Green', value: 'blueGreen' },
            { label: 'Purple-Blue', value: 'purpleBlue' },
          ],
          defaultValue: 'heat',
          description: 'Color scheme for values',
        },
      ],
    },
    {
      id: 'toolbox',
      title: 'Toolbox Utilities',
      icon: 'Sliders',
      defaultExpanded: false,
      fields: [
        {
          key: 'toolbox.show',
          label: 'Show Toolbox',
          type: 'boolean',
          defaultValue: false,
          description: 'Show visual utility controls like Save Image',
        },
      ],
    },
    {
      id: 'animation',
      title: 'Animation',
      icon: 'Sliders',
      defaultExpanded: false,
      fields: [
        {
          key: 'animation.duration',
          label: 'Animation Duration (ms)',
          type: 'number',
          defaultValue: 1000,
          description: 'Duration of chart rendering animation',
        },
      ],
    },
  ],
  defaultConfig: {
    calendar: { startDate: '2024-01-01', endDate: '2024-12-31', yearPosition: 'left', monthPosition: 'top', cellSize: 15, range: 'year', showBorder: true, splitLineShow: true },
    dataLabels: { show: false, formatter: '{c}', fontSize: 10, color: '#ffffff' },
    legend: { show: false, position: 'bottom' },
    visualMap: { show: true, min: 0, max: 100, calculable: false, orient: 'horizontal', inRangeColor: 'heat' },
    toolbox: { show: false },
    animation: { duration: 1000 },
  },
});

export function buildCalendarChartOptions({
  categories,
  series,
  visualConfig = {},
}: CalendarChartOptions): EChartsOption {
  const cfg = visualConfig;
  
  const colorSchemes: Record<string, string[]> = {
    heat: ['#fef3c7', '#fcd34d', '#f59e0b', '#dc2626', '#991b1b'],
    blueGreen: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0284c7', '#0c4a6e'],
    purpleBlue: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#6366f1', '#312e81'],
  };

  const startDate = getConfigValue(cfg, 'calendar.startDate') ?? '2024-01-01';
  const endDate = getConfigValue(cfg, 'calendar.endDate') ?? '2024-12-31';
  const cellSize = getConfigValue(cfg, 'calendar.cellSize') ?? 15;

  return {
    animationDuration: getConfigValue(cfg, 'animation.duration') ?? 1000,
    toolbox: getConfigValue(cfg, 'toolbox.show') ? {
      show: true,
      feature: {
        saveAsImage: { show: true, title: 'Save' },
        restore: { show: true, title: 'Restore' },
        dataView: { show: true, readOnly: false, title: 'Data View' },
      }
    } : undefined,
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params;
        const date = new Date(param.value[0]).toLocaleDateString();
        return `${date}: ${param.value[1]}`;
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? false,
      top: getConfigValue(cfg, 'legend.position') ?? 'bottom',
    },
    visualMap: {
      show: getConfigValue(cfg, 'visualMap.show') ?? true,
      min: getConfigValue(cfg, 'visualMap.min') ?? 0,
      max: getConfigValue(cfg, 'visualMap.max') ?? 100,
      calculable: getConfigValue(cfg, 'visualMap.calculable') ?? false,
      orient: getConfigValue(cfg, 'visualMap.orient') ?? 'horizontal',
      inRange: {
        color: colorSchemes[getConfigValue(cfg, 'visualMap.inRangeColor') ?? 'heat'],
      },
    },
    calendar: {
      top: 60,
      left: 30,
      right: 30,
      cellSize: cellSize,
      range: [startDate, endDate],
      itemStyle: {
        borderWidth: getConfigValue(cfg, 'calendar.showBorder') ?? true ? 0.5 : 0,
      },
      yearLabel: {
        show: getConfigValue(cfg, 'calendar.yearPosition') !== 'none',
        position: getConfigValue(cfg, 'calendar.yearPosition') === 'none' ? 'left' : getConfigValue(cfg, 'calendar.yearPosition'),
      },
      monthLabel: {
        show: getConfigValue(cfg, 'calendar.monthPosition') !== 'none',
        position: getConfigValue(cfg, 'calendar.monthPosition') === 'none' ? 'top' : getConfigValue(cfg, 'calendar.monthPosition'),
      },
      splitLine: {
        show: getConfigValue(cfg, 'calendar.splitLineShow') ?? true,
      },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: series[0]?.data.map(item => [item[0], item[1]]) ?? [],
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? false,
          formatter: getConfigValue(cfg, 'dataLabels.formatter'),
          fontSize: getConfigValue(cfg, 'dataLabels.fontSize') ?? 10,
          color: getConfigValue(cfg, 'dataLabels.color') ?? '#ffffff',
        },
        itemStyle: {
          borderRadius: 3,
        },
      },
    ],
  };
}
