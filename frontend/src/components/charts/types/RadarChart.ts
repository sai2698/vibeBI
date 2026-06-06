import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface RadarChartOptions {
  categories: string[]; // Indicator names
  series: Array<{
    name: string;
    data: number[];
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
    };
    radar?: {
      smooth?: boolean;
      areaFill?: boolean;
      areaOpacity?: number;
      indicatorMax?: number;
    };
    colorPalette?: string[];
  };
}

export const radarChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'radar',
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
          description: 'Display legend to toggle series',
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
          defaultValue: false,
          description: 'Display values on data points',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{c}',
          description: 'Template: {c} for value',
        },
      ],
    },
    {
      id: 'radar',
      title: 'Radar Settings',
      icon: 'Radical',
      defaultExpanded: false,
      fields: [
        {
          key: 'radar.shape',
          label: 'Radar Shape',
          type: 'select',
          options: [
            { label: 'Polygon', value: 'polygon' },
            { label: 'Circle', value: 'circle' },
          ],
          defaultValue: 'polygon',
          description: 'Outer/inner shape of radar axes',
        },
        {
          key: 'radar.splitNumber',
          label: 'Split Number',
          type: 'range',
          min: 3,
          max: 10,
          step: 1,
          defaultValue: 5,
          description: 'Number of indicator ring segments',
        },
        {
          key: 'radar.smooth',
          label: 'Smooth Curve',
          type: 'boolean',
          defaultValue: false,
          description: 'Use smooth curves instead of sharp angles',
        },
        {
          key: 'radar.areaFill',
          label: 'Fill Area',
          type: 'boolean',
          defaultValue: true,
          description: 'Fill area inside the radar shape',
        },
        {
          key: 'radar.areaOpacity',
          label: 'Fill Opacity',
          type: 'range',
          min: 0,
          max: 100,
          step: 10,
          defaultValue: 30,
          description: 'Opacity of area fill (0-100%)',
        },
        {
          key: 'radar.indicatorMax',
          label: 'Indicator Max Value',
          type: 'number',
          placeholder: 'Auto',
          description: 'Maximum value for all indicators (leave empty for auto)',
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
    legend: { show: true, orientation: 'horizontal', position: 'bottom' },
    dataLabels: { show: false, formatter: '{c}' },
    radar: { shape: 'polygon', splitNumber: 5, smooth: false, areaFill: true, areaOpacity: 30, indicatorMax: null },
    toolbox: { show: false },
    animation: { duration: 1000 },
  },
});

export function buildRadarChartOptions({
  categories,
  series,
  visualConfig = {},
}: RadarChartOptions): EChartsOption {
  const cfg = visualConfig;
  const colors = visualConfig?.colorPalette;

  // Create indicator config with dynamic max calculation if indicatorMax is not specified
  const allValues = series.flatMap((s) => s.data || []);
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
  const indicatorMax = getConfigValue(cfg, 'radar.indicatorMax') || (maxVal > 0 ? Math.ceil(maxVal * 1.1) : 100);

  const indicators = categories.map((category) => ({
    name: category,
    max: indicatorMax,
  }));

  // Build series
  const radarSeries = series.map((s) => {
    const baseSeries: any = {
      name: s.name,
      type: 'radar',
      data: [s.data],
      smooth: getConfigValue(cfg, 'radar.smooth') ?? false,
    };

    // Area fill
    if (getConfigValue(cfg, 'radar.areaFill')) {
      baseSeries.areaStyle = {
        opacity: (getConfigValue(cfg, 'radar.areaOpacity') ?? 30) / 100,
      };
    }

    // Data labels
    if (getConfigValue(cfg, 'dataLabels.show')) {
      baseSeries.label = {
        show: true,
        formatter: getConfigValue(cfg, 'dataLabels.formatter') ?? '{c}',
      };
    }

    return baseSeries;
  });

  return {
    color: colors,
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
      trigger: 'item',
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      orient: getConfigValue(cfg, 'legend.orientation') ?? 'horizontal',
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 0 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
      data: series.map((s) => s.name),
    },
    radar: {
      indicator: indicators,
      shape: getConfigValue(cfg, 'radar.shape') || 'polygon',
      splitNumber: getConfigValue(cfg, 'radar.splitNumber') ?? 5,
      axisName: {
        color: '#64748b',
        fontSize: 11,
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)'],
        },
      },
      axisLine: {
        lineStyle: {
          color: '#cbd5e1',
        },
      },
      splitLine: {
        lineStyle: {
          color: '#cbd5e1',
        },
      },
    },
    series: radarSeries,
  };
}
