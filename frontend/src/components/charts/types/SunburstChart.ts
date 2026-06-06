import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface SunburstChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data: Array<{
      name: string;
      value: number;
      children?: Array<{ name: string; value: number; children?: any[] }>;
    }>;
  }>;
  visualConfig?: {
    legend?: {
      show?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    dataLabels?: {
      show?: boolean;
      formatter?: string;
      rotate?: boolean;
    };
    sunburst?: {
      sort?: 'desc' | 'asc' | null;
      radius?: string;
      highlightPolicy?: 'ancestor' | 'descendant';
    };
    colorPalette?: string[];
  };
}

export const sunburstChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'sunburst',
  sections: [
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
          description: 'Display legend for color coding',
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
      id: 'dataLabels',
      title: 'Data Labels',
      icon: 'Tag',
      defaultExpanded: false,
      fields: [
        {
          key: 'dataLabels.show',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Display values in sunburst segments',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{b}',
          description: 'Template: {b}=name, {c}=value',
        },
        {
          key: 'dataLabels.rotate',
          label: 'Rotate Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Rotate labels to follow sunburst curvature',
        },
      ],
    },
    {
      id: 'sunburst',
      title: 'Sunburst Settings',
      icon: 'Sun',
      defaultExpanded: false,
      fields: [
        {
          key: 'sunburst.sort',
          label: 'Sort Order',
          type: 'select',
          options: [
            { label: 'Descending', value: 'desc' },
            { label: 'Ascending', value: 'asc' },
            { label: 'None', value: 'null' },
          ],
          defaultValue: 'desc',
          description: 'Sort order of segments by value',
        },
        {
          key: 'sunburst.radius',
          label: 'Radius',
          type: 'text',
          placeholder: '0% 90%',
          description: 'Inner and outer radius (e.g., 0% 90%)',
        },
        {
          key: 'sunburst.highlightPolicy',
          label: 'Highlight Policy',
          type: 'select',
          options: [
            { label: 'Ancestor', value: 'ancestor' },
            { label: 'Descendant', value: 'descendant' },
          ],
          defaultValue: 'descendant',
          description: 'Which nodes to highlight on hover',
        },
      ],
    },
  ],
  defaultConfig: {
    legend: { show: true, position: 'right' },
    dataLabels: { show: true, formatter: '{b}', rotate: false },
    sunburst: { sort: 'desc', radius: '0% 90%', highlightPolicy: 'descendant' },
  },
});

export function buildSunburstChartOptions({
  categories: _categories,
  series,
  visualConfig = {},
}: SunburstChartOptions): EChartsOption {
  const cfg = visualConfig;
  const colors = visualConfig?.colorPalette;

  // Flatten series data into sunburst format
  const sunburstData = series[0]?.data ?? [];

  return {
    color: colors,
    tooltip: {
      formatter: (params: any) => {
        if (params.data) {
          return `${params.data.name}: ${params.data.value}`;
        }
        return '';
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 0 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
    },
    series: [
      {
        type: 'sunburst',
        data: sunburstData,
        radius: getConfigValue(cfg, 'sunburst.radius') ?? '0% 90%',
        sort: getConfigValue(cfg, 'sunburst.sort') === 'null' ? null : (getConfigValue(cfg, 'sunburst.sort') ?? 'desc'),
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{b}',
          rotate: getConfigValue(cfg, 'dataLabels.rotate') ?? false,
        },
        emphasis: {
          focus: 'descendant',
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: '#fff',
        },
      },
    ],
  };
}
