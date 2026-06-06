import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface FunnelChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data: Array<{ name: string; value: number }>;
  }>;
  visualConfig?: {
    legend?: {
      show?: boolean;
      orientation?: 'horizontal' | 'vertical';
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    dataLabels?: {
      show?: boolean;
      formatter?: string;
      position?: 'inside' | 'outside' | 'left' | 'right';
    };
    funnel?: {
      sort?: 'descending' | 'ascending' | null;
      gap?: number;
      align?: 'left' | 'center' | 'right';
      min?: number;
      max?: number;
    };
    colorPalette?: string[];
  };
}

export const funnelChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'funnel',
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
          description: 'Display legend to toggle categories',
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
          description: 'Legend layout direction',
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
          description: 'Legend position relative to chart',
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
          description: 'Display values on funnel segments',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{b}: {c} ({d}%)',
          description: 'Template: {b}=name, {c}=value, {d}=%',
        },
        {
          key: 'dataLabels.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Inside', value: 'inside' },
            { label: 'Outside', value: 'outside' },
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ],
          defaultValue: 'inside',
          description: 'Label position on segments',
        },
      ],
    },
    {
      id: 'funnel',
      title: 'Funnel Settings',
      icon: 'Funnel',
      defaultExpanded: false,
      fields: [
        {
          key: 'funnel.sort',
          label: 'Sort Order',
          type: 'select',
          options: [
            { label: 'Descending', value: 'descending' },
            { label: 'Ascending', value: 'ascending' },
            { label: 'None', value: 'null' },
          ],
          defaultValue: 'descending',
          description: 'Sort order of funnel segments',
        },
        {
          key: 'funnel.gap',
          label: 'Gap Between Segments',
          type: 'range',
          min: 0,
          max: 20,
          step: 1,
          defaultValue: 2,
          description: 'Space between funnel segments (0-20px)',
        },
        {
          key: 'funnel.align',
          label: 'Alignment',
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
          defaultValue: 'center',
          description: 'Horizontal alignment of funnel',
        },
        {
          key: 'funnel.min',
          label: 'Minimum Value',
          type: 'number',
          defaultValue: 0,
          description: 'Minimum value for funnel scale',
        },
        {
          key: 'funnel.max',
          label: 'Maximum Value',
          type: 'number',
          placeholder: 'Auto',
          description: 'Maximum value for funnel scale (leave empty for auto)',
        },
      ],
    },
  ],
  defaultConfig: {
    legend: { show: true, orientation: 'horizontal', position: 'right' },
    dataLabels: { show: true, formatter: '{b}: {c} ({d}%)', position: 'inside' },
    funnel: { sort: 'descending', gap: 2, align: 'center', min: 0, max: null },
  },
});

export function buildFunnelChartOptions({
  categories: _categories,
  series,
  visualConfig = {},
}: FunnelChartOptions): EChartsOption {
  const cfg = visualConfig;
  const colors = visualConfig?.colorPalette;

  // Use series data directly
  const funnelData = series[0]?.data ?? [];

  return {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      orient: getConfigValue(cfg, 'legend.orientation') ?? 'horizontal',
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 0 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
      data: funnelData.map((d) => d.name),
    },
    series: [
      {
        name: series[0]?.name ?? 'Funnel',
        type: 'funnel',
        left: '10%',
        top: '5%',
        bottom: '5%',
        width: '80%',
        min: getConfigValue(cfg, 'funnel.min') ?? 0,
        max: getConfigValue(cfg, 'funnel.max') ?? undefined,
        minSize: '0%',
        maxSize: '100%',
        sort: getConfigValue(cfg, 'funnel.sort') === 'null' ? null : (getConfigValue(cfg, 'funnel.sort') ?? 'descending'),
        gap: getConfigValue(cfg, 'funnel.gap') ?? 2,
        funnelAlign: getConfigValue(cfg, 'funnel.align') ?? 'center',
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{b}: {c} ({d}%)',
          position: getConfigValue(cfg, 'dataLabels.position') ?? 'inside',
        },
        emphasis: {
          label: {
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        data: funnelData,
      },
    ],
  };
}
