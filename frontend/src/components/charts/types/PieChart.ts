import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface PieChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data?: number[];
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
    pie?: {
      donut?: boolean;
      innerRadius?: number;
      outerRadius?: number;
      roseType?: boolean;
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

export const pieChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'pie',
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
          description: 'Display values on pie slices',
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
            { label: 'Center', value: 'center' },
          ],
          defaultValue: 'outside',
          description: 'Label position on slices',
        },
      ],
    },
    {
      id: 'pie',
      title: 'Pie Settings',
      icon: 'PieChart',
      defaultExpanded: false,
      fields: [
        {
          key: 'pie.donut',
          label: 'Donut Style',
          type: 'boolean',
          defaultValue: false,
          description: 'Create donut chart with hollow center',
        },
        {
          key: 'pie.innerRadius',
          label: 'Inner Radius',
          type: 'range',
          min: 20,
          max: 60,
          step: 5,
          defaultValue: 40,
          description: 'Inner radius percentage (only for donut)',
        },
        {
          key: 'pie.outerRadius',
          label: 'Outer Radius',
          type: 'range',
          min: 50,
          max: 90,
          step: 5,
          defaultValue: 75,
          description: 'Outer radius percentage',
        },
        {
          key: 'pie.roseType',
          label: 'Rose Chart',
          type: 'boolean',
          defaultValue: false,
          description: 'Use rose chart (area represents value)',
        },
        {
          key: 'pie.borderRadius',
          label: 'Corner Rounding (Radius)',
          type: 'range',
          min: 0,
          max: 20,
          step: 1,
          defaultValue: 0,
          description: 'Add rounded borders to pie slices (vibrant aesthetic)',
        },
        {
          key: 'pie.padAngle',
          label: 'Slice Gap Angle',
          type: 'range',
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 0,
          description: 'Add spacing/gaps between pie slices',
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
    dataLabels: { show: true, formatter: '{b}: {c} ({d}%)', position: 'outside' },
    pie: { donut: false, innerRadius: 40, outerRadius: 75, roseType: false, borderRadius: 0, padAngle: 0 },
    toolbox: { show: false },
    animation: { duration: 1000 },
  },
});

export function buildPieChartOptions(options: PieChartOptions): EChartsOption {
  const categories = options?.categories || [];
  const series = options?.series || [];
  const cfg = options?.visualConfig || {};

  // Combine categories and series data into pie data
  let pieData: Array<{ name: string; value: number }> = [];
  if (categories && categories.length > 0) {
    pieData = categories.map((category, index) => ({
      name: category,
      value: series[0]?.data?.[index] ?? 0,
    }));
  } else if (series && series.length > 0) {
    if (series[0]?.value !== undefined) {
      pieData = series.map((s) => ({
        name: s.name,
        value: s.value ?? 0,
      }));
    } else if (series[0]?.data) {
      pieData = (series[0].data || []).map((val, index) => ({
        name: `Category ${index + 1}`,
        value: val ?? 0,
      }));
    }
  }

  const innerRadius = getConfigValue(cfg, 'pie.innerRadius') ?? 40;
  const outerRadius = getConfigValue(cfg, 'pie.outerRadius') ?? 75;
  const isDonut = getConfigValue(cfg, 'pie.donut') ?? false;
  const isRoseType = getConfigValue(cfg, 'pie.roseType') ?? false;
  const borderRadius = getConfigValue(cfg, 'pie.borderRadius') ?? 0;
  const padAngle = getConfigValue(cfg, 'pie.padAngle') ?? 0;
  const toolboxShow = getConfigValue(cfg, 'toolbox.show') === true;
  const animationDuration = getConfigValue(cfg, 'animation.duration') ?? 1000;

  const displayCategories = categories.length > 0 ? categories : pieData.map(d => d.name);
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
        selectedMode: 'multiple',
        radius: isDonut 
          ? [`${innerRadius}%`, `${outerRadius}%`] 
          : `${outerRadius}%`,
        roseType: isRoseType,
        padAngle: padAngle,
        itemStyle: {
          borderRadius: borderRadius,
          borderColor: borderRadius > 0 || padAngle > 0 ? '#fff' : undefined,
          borderWidth: borderRadius > 0 || padAngle > 0 ? 2 : undefined,
        },
        data: pieData,
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{b}: {c} ({d}%)',
          position: getConfigValue(cfg, 'dataLabels.position') ?? 'outside',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}
