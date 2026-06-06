import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface DonutChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
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
      position?: 'inside' | 'outside' | 'center';
    };
    donut?: {
      innerRadius?: number;
      outerRadius?: number;
      showTotal?: boolean;
      totalLabel?: string;
      borderRadius?: number;
      padAngle?: number;
    };
    toolbox?: {
      show?: boolean;
    };
    animation?: {
      duration?: number;
    };
  };
}

export const donutChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'donut',
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
          defaultValue: 'bottom',
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
          description: 'Display values on donut slices',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{b}: {d}%',
          description: 'Template: {b}=name, {c}=value, {d}=%',
        },
        {
          key: 'dataLabels.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Inside', value: 'inside' },
            { label: 'Outside', value: 'outside' },
            { label: 'Center', value: 'center' },
          ],
          defaultValue: 'inside',
          description: 'Label position on slices',
        },
      ],
    },
    {
      id: 'donut',
      title: 'Donut Settings',
      icon: 'PieChart',
      defaultExpanded: false,
      fields: [
        {
          key: 'donut.innerRadius',
          label: 'Inner Radius',
          type: 'range',
          min: 30,
          max: 70,
          step: 5,
          defaultValue: 50,
          description: 'Inner radius percentage',
        },
        {
          key: 'donut.outerRadius',
          label: 'Outer Radius',
          type: 'range',
          min: 60,
          max: 95,
          step: 5,
          defaultValue: 80,
          description: 'Outer radius percentage',
        },
        {
          key: 'donut.showTotal',
          label: 'Show Total',
          type: 'boolean',
          defaultValue: true,
          description: 'Display total value in center',
        },
        {
          key: 'donut.totalLabel',
          label: 'Total Label',
          type: 'text',
          placeholder: 'Total',
          description: 'Label for total value',
        },
        {
          key: 'donut.borderRadius',
          label: 'Corner Rounding (Radius)',
          type: 'range',
          min: 0,
          max: 20,
          step: 1,
          defaultValue: 0,
          description: 'Add rounded borders to donut slices (vibrant aesthetic)',
        },
        {
          key: 'donut.padAngle',
          label: 'Slice Gap Angle',
          type: 'range',
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 0,
          description: 'Add spacing/gaps between donut slices',
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
  ],
  defaultConfig: {
    legend: { show: true, orientation: 'horizontal', position: 'bottom' },
    dataLabels: { show: true, formatter: '{b}: {d}%', position: 'inside' },
    donut: { innerRadius: 50, outerRadius: 80, showTotal: true, totalLabel: 'Total', borderRadius: 0, padAngle: 0 },
    toolbox: { show: false },
    animation: { duration: 1000 },
  },
});

export function buildDonutChartOptions(options: DonutChartOptions): EChartsOption {
  const categories = options?.categories || [];
  const series = options?.series || [];
  const cfg = options?.visualConfig || {};

  // Combine categories and series data into donut data
  let donutData: Array<{ name: string; value: number }> = [];
  if (categories && categories.length > 0) {
    donutData = categories.map((category, index) => ({
      name: category,
      value: series[0]?.data?.[index] ?? 0,
    }));
  } else if (series && series.length > 0) {
    if (series[0]?.value !== undefined) {
      donutData = series.map((s) => ({
        name: s.name,
        value: s.value ?? 0,
      }));
    } else if (series[0]?.data) {
      donutData = (series[0].data || []).map((val, index) => ({
        name: `Category ${index + 1}`,
        value: val ?? 0,
      }));
    }
  }

  const innerRadius = getConfigValue(cfg, 'donut.innerRadius') ?? 50;
  const outerRadius = getConfigValue(cfg, 'donut.outerRadius') ?? 80;
  const showTotal = getConfigValue(cfg, 'donut.showTotal') ?? true;
  const totalLabel = getConfigValue(cfg, 'donut.totalLabel') ?? 'Total';
  const borderRadius = getConfigValue(cfg, 'donut.borderRadius') ?? 0;
  const padAngle = getConfigValue(cfg, 'donut.padAngle') ?? 0;
  const toolboxShow = getConfigValue(cfg, 'toolbox.show') === true;
  const animationDuration = getConfigValue(cfg, 'animation.duration') ?? 1000;

  // Calculate total
  const total = donutData.reduce((sum, item) => sum + item.value, 0);

  const displayCategories = categories.length > 0 ? categories : donutData.map(d => d.name);
  const colors = getConfigValue(cfg, 'colorPalette') || (cfg as any)?.colorPalette;

  return {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    animationDuration,
    toolbox: {
      show: toolboxShow,
      feature: {
        saveAsImage: { show: true },
        dataView: { show: true, readOnly: false },
        restore: { show: true },
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      orient: getConfigValue(cfg, 'legend.orientation') ?? 'horizontal',
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 0 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
      data: displayCategories,
    },
    series: [
      {
        name: series[0]?.name ?? 'Data',
        type: 'pie',
        radius: [`${innerRadius}%`, `${outerRadius}%`],
        padAngle: padAngle,
        itemStyle: {
          borderRadius: borderRadius,
          borderColor: borderRadius > 0 || padAngle > 0 ? '#fff' : undefined,
          borderWidth: borderRadius > 0 || padAngle > 0 ? 2 : undefined,
        },
        data: donutData,
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{b}: {d}%',
          position: getConfigValue(cfg, 'dataLabels.position') ?? 'inside',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        // Add total in center
        ...(showTotal
          ? {
              center: ['50%', '50%'],
              label: {
                show: true,
                formatter: `{a|${totalLabel}}\n{b|${total}}`,
                rich: {
                  a: {
                    fontSize: 12,
                    color: '#64748b',
                    lineHeight: 14,
                  },
                  b: {
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#1e293b',
                    lineHeight: 24,
                  },
                },
              },
            }
          : {}),
      },
    ],
  };
}
