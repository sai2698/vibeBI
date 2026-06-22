import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';
import {
  pieLabelMode,
  formatAxisValue,
} from '../../../utils/numberFormat';

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
  const showLabels = getConfigValue(cfg, 'dataLabels.show') ?? true;
  const explicitPosition = getConfigValue(cfg, 'dataLabels.position') ?? null;

  // Calculate total (formatted for center display)
  const total = donutData.reduce((sum, item) => sum + item.value, 0);
  const totalFormatted = formatAxisValue(total);

  const displayCategories = categories.length > 0 ? categories : donutData.map(d => d.name);
  const colors = getConfigValue(cfg, 'colorPalette') || (cfg as any)?.colorPalette;
  const showLegend = getConfigValue(cfg, 'legend.show') ?? true;

  // Auto label mode
  const labelMode = showLabels ? pieLabelMode(donutData.length, explicitPosition) : 'none';
  const effectiveOuter = labelMode === 'outside' ? Math.min(outerRadius, 72) : outerRadius;

  const labelConfig: any = labelMode === 'outside'
    ? { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11, lineHeight: 14, overflow: 'truncate', width: 80 }
    : labelMode === 'inside'
    ? { show: true, position: 'inside', formatter: '{d}%', fontSize: 11, fontWeight: 'bold', color: '#fff' }
    : { show: false };

  const labelLineConfig: any = labelMode === 'outside'
    ? { show: true, length: 10, length2: 14, smooth: 0.5, lineStyle: { width: 1.5 }, minTurnAngle: 90 }
    : { show: false };

  // Center graphic for total (separate from series label to avoid conflicts)
  const centerGraphic = showTotal ? [
    {
      type: 'text',
      style: {
        text: totalLabel,
        x: '50%',
        y: 'calc(50% - 14px)',
        textAlign: 'center',
        fill: '#64748b',
        font: '12px sans-serif',
      } as any,
    },
    {
      type: 'text',
      style: {
        text: totalFormatted,
        x: '50%',
        y: 'calc(50% + 10px)',
        textAlign: 'center',
        fill: '#1e293b',
        font: 'bold 20px sans-serif',
      } as any,
    },
  ] : [];

  return {
    color: colors,
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: '{b}: {c} ({d}%)',
    },
    animationDuration,
    toolbox: {
      show: toolboxShow,
      feature: { saveAsImage: { show: true }, dataView: { show: true, readOnly: false }, restore: { show: true } },
    },
    legend: {
      show: showLegend,
      orient: getConfigValue(cfg, 'legend.orientation') ?? 'horizontal',
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 5 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
      data: displayCategories,
      type: 'scroll',
      pageIconSize: 10,
    },
    graphic: centerGraphic,
    series: [
      {
        name: series[0]?.name ?? 'Data',
        type: 'pie',
        radius: [`${innerRadius}%`, `${effectiveOuter}%`],
        padAngle,
        avoidLabelOverlap: true,
        minShowLabelAngle: 5,
        itemStyle: {
          borderRadius,
          borderColor: borderRadius > 0 || padAngle > 0 ? '#fff' : undefined,
          borderWidth: borderRadius > 0 || padAngle > 0 ? 2 : undefined,
        },
        data: donutData,
        label: labelConfig,
        labelLine: labelLineConfig,
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
          label: { show: labelMode !== 'none', fontWeight: 'bold' },
        },
      },
    ],
  };
}
