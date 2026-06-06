import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface TreemapChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data: Array<{
      name: string;
      value: number;
      children?: Array<{ name: string; value: number }>;
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
    };
    treemap?: {
      showBreadcrumb?: boolean;
      breadcrumbPosition?: 'top' | 'bottom';
      nodeClick?: 'expand' | 'collapse' | false;
      roam?: boolean;
    };
    colorPalette?: string[];
  };
}

export const treemapChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'treemap',
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
          defaultValue: 'top',
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
          description: 'Display values in tree nodes',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{b}: {c}',
          description: 'Template: {b}=name, {c}=value',
        },
      ],
    },
    {
      id: 'treemap',
      title: 'Treemap Settings',
      icon: 'Grid3x3',
      defaultExpanded: false,
      fields: [
        {
          key: 'treemap.showBreadcrumb',
          label: 'Show Breadcrumb',
          type: 'boolean',
          defaultValue: true,
          description: 'Display navigation breadcrumb',
        },
        {
          key: 'treemap.breadcrumbPosition',
          label: 'Breadcrumb Position',
          type: 'select',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' },
          ],
          defaultValue: 'top',
          description: 'Position of breadcrumb navigation',
        },
        {
          key: 'treemap.nodeClick',
          label: 'Node Click Action',
          type: 'select',
          options: [
            { label: 'Expand/Collapse', value: 'expand' },
            { label: 'Collapse', value: 'collapse' },
            { label: 'Disabled', value: 'false' },
          ],
          defaultValue: 'expand',
          description: 'Action when clicking on nodes',
        },
        {
          key: 'treemap.roam',
          label: 'Enable Pan/Zoom',
          type: 'boolean',
          defaultValue: true,
          description: 'Allow panning and zooming',
        },
      ],
    },
  ],
  defaultConfig: {
    legend: { show: true, position: 'top' },
    dataLabels: { show: true, formatter: '{b}: {c}' },
    treemap: { showBreadcrumb: true, breadcrumbPosition: 'top', nodeClick: 'expand', roam: true },
  },
});

export function buildTreemapChartOptions({
  categories: _categories,
  series,
  visualConfig = {},
}: TreemapChartOptions): EChartsOption {
  const cfg = visualConfig;
  const colors = visualConfig?.colorPalette;

  // Flatten series data into treemap format
  const treemapData = series[0]?.data ?? [];

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
        type: 'treemap',
        data: treemapData,
        breadcrumb: {
          show: getConfigValue(cfg, 'treemap.showBreadcrumb') ?? true,
          top: getConfigValue(cfg, 'treemap.breadcrumbPosition') === 'top' ? 0 : undefined,
          bottom: getConfigValue(cfg, 'treemap.breadcrumbPosition') === 'bottom' ? 0 : undefined,
        },
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{b}: {c}',
        },
        roam: getConfigValue(cfg, 'treemap.roam') ?? true,
        nodeClick: getConfigValue(cfg, 'treemap.nodeClick') === 'false' ? false : (getConfigValue(cfg, 'treemap.nodeClick') ?? 'expand'),
        emphasis: {
          focus: 'descendant',
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 0,
              gapWidth: 1,
            },
          },
          {
            itemStyle: {
              gapWidth: 1,
              borderColorSaturation: 0.6,
            },
          },
        ],
      },
    ],
  };
}
