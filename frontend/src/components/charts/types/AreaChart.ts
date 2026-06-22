import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';
import {
  axisLabelFormatter,
  autoRotation,
  gridBottomForRotation,
} from '../../../utils/numberFormat';

type EChartsOption = echarts.EChartsOption;

export interface AreaChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: {
    x_axis?: {
      title?: string;
      labelRotation?: number;
      truncate?: boolean;
      showGridLines?: boolean;
    };
    y_axis?: {
      title?: string;
      showLabels?: boolean;
      min?: number | null;
      max?: number | null;
      showGridLines?: boolean;
    };
    legend?: {
      show?: boolean;
      orientation?: 'horizontal' | 'vertical';
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    dataLabels?: {
      show?: boolean;
      formatter?: string;
    };
    line?: {
      smooth?: boolean;
      showPoints?: boolean;
      stacking?: boolean;
      areaFill?: boolean;
      areaOpacity?: number;
    };
    dataZoom?: {
      show?: boolean;
      type?: 'slider' | 'inside';
      orient?: 'horizontal' | 'vertical';
    };
    toolbox?: {
      show?: boolean;
    };
    animation?: {
      duration?: number;
    };
    colorPalette?: string[];
  };
}

export const areaChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'area',
  sections: [
    {
      id: 'x_axis',
      title: 'X-Axis',
      icon: 'MoveHorizontal',
      defaultExpanded: true,
      fields: [
        {
          key: 'x_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter X-axis title',
          description: 'Title displayed below the X-axis',
        },
        {
          key: 'x_axis.labelRotation',
          label: 'Label Rotation',
          type: 'range',
          min: 0,
          max: 90,
          step: 15,
          defaultValue: 0,
          description: 'Rotate X-axis labels (0-90 degrees)',
        },
        {
          key: 'x_axis.truncate',
          label: 'Truncate Long Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Truncate long X-axis labels with ellipsis',
        },
        {
          key: 'x_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: false,
          description: 'Display background grid lines along X-axis',
        },
      ],
    },
    {
      id: 'y_axis',
      title: 'Y-Axis',
      icon: 'MoveVertical',
      defaultExpanded: false,
      fields: [
        {
          key: 'y_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter Y-axis title',
          description: 'Title displayed beside the Y-axis',
        },
        {
          key: 'y_axis.showLabels',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: true,
          description: 'Display numeric labels on Y-axis',
        },
        {
          key: 'y_axis.min',
          label: 'Minimum Value',
          type: 'number',
          placeholder: 'Auto',
          description: 'Minimum Y-axis value (leave empty for auto)',
        },
        {
          key: 'y_axis.max',
          label: 'Maximum Value',
          type: 'number',
          placeholder: 'Auto',
          description: 'Maximum Y-axis value (leave empty for auto)',
        },
        {
          key: 'y_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: true,
          description: 'Display background grid lines along Y-axis',
        },
      ],
    },
    {
      id: 'legend',
      title: 'Legend',
      icon: 'LayoutList',
      defaultExpanded: false,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display legend to toggle series visibility',
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
          label: 'Show Data Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Display values on data points',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{c}',
          description: 'Template: {c} for value, {a} for series name',
        },
      ],
    },
    {
      id: 'line',
      title: 'Area Settings',
      icon: 'LineChart',
      defaultExpanded: false,
      fields: [
        {
          key: 'line.smooth',
          label: 'Smooth Curve',
          type: 'boolean',
          defaultValue: false,
          description: 'Use smooth curves instead of straight lines',
        },
        {
          key: 'line.showPoints',
          label: 'Show Points',
          type: 'boolean',
          defaultValue: false,
          description: 'Display markers at data points',
        },
        {
          key: 'line.stacking',
          label: 'Stacked Areas',
          type: 'boolean',
          defaultValue: false,
          description: 'Stack areas on top of each other',
        },
        {
          key: 'line.areaFill',
          label: 'Fill Area',
          type: 'boolean',
          defaultValue: true,
          description: 'Fill area under the line',
        },
        {
          key: 'line.areaOpacity',
          label: 'Fill Opacity',
          type: 'range',
          min: 0,
          max: 100,
          step: 10,
          defaultValue: 30,
          description: 'Opacity of area fill (0-100%)',
        },
      ],
    },
    {
      id: 'dataZoom',
      title: 'Data Zoom & Scroll',
      icon: 'MoveHorizontal',
      defaultExpanded: false,
      fields: [
        {
          key: 'dataZoom.show',
          label: 'Enable Zoom/Scroll',
          type: 'boolean',
          defaultValue: false,
          description: 'Enable scrolling/zooming along axes',
        },
        {
          key: 'dataZoom.type',
          label: 'Zoom Type',
          type: 'select',
          options: [
            { label: 'Slider Scrollbar', value: 'slider' },
            { label: 'Inside Mouse/Touch', value: 'inside' },
          ],
          defaultValue: 'slider',
          description: 'Choose scrollbar or mouse zoom',
        },
        {
          key: 'dataZoom.orient',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal (X-axis)', value: 'horizontal' },
            { label: 'Vertical (Y-axis)', value: 'vertical' },
          ],
          defaultValue: 'horizontal',
          description: 'Direction of zoom/scroll',
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
    x_axis: { title: '', labelRotation: 0, truncate: true, showGridLines: false },
    y_axis: { title: '', showLabels: true, min: null, max: null, showGridLines: true },
    legend: { show: true, orientation: 'horizontal', position: 'top' },
    dataLabels: { show: false, formatter: '{c}' },
    line: { smooth: false, showPoints: false, stacking: false, areaFill: true, areaOpacity: 30 },
    dataZoom: { show: false, type: 'slider', orient: 'horizontal' },
    toolbox: { show: false },
    animation: { duration: 1000 },
  },
});

export function buildAreaChartOptions({
  categories,
  series,
  visualConfig = {},
}: AreaChartOptions): EChartsOption {
  const cfg = visualConfig;
  const colors = visualConfig?.colorPalette;

  const seriesConfig = series.map((s) => {
    const baseSeries: any = {
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: getConfigValue(cfg, 'line.smooth') ?? false,
      showSymbol: getConfigValue(cfg, 'line.showPoints') ?? false,
    };

    // Stacking
    if (getConfigValue(cfg, 'line.stacking')) {
      baseSeries.stack = 'total';
    }

    // Area fill
    if (getConfigValue(cfg, 'line.areaFill')) {
      baseSeries.areaStyle = {
        opacity: (getConfigValue(cfg, 'line.areaOpacity') ?? 30) / 100,
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

  const dataZoomShow = getConfigValue(cfg, 'dataZoom.show') === true;
  const dataZoomType = getConfigValue(cfg, 'dataZoom.type') || 'slider';
  const dataZoomOrient = getConfigValue(cfg, 'dataZoom.orient') || 'horizontal';
  const toolboxShow = getConfigValue(cfg, 'toolbox.show') === true;
  const animationDuration = getConfigValue(cfg, 'animation.duration') ?? 1000;
  const showLegend = getConfigValue(cfg, 'legend.show') ?? true;
  const xAxisRotationCfg = getConfigValue(cfg, 'x_axis.labelRotation') ?? 0;
  const effectiveRotation = autoRotation((categories || []).length, xAxisRotationCfg || null);
  const gridBottom = gridBottomForRotation(effectiveRotation, Boolean(showLegend));

  return {
    color: colors,
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
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
    dataZoom: dataZoomShow ? [
      {
        show: true,
        type: dataZoomType,
        orient: dataZoomOrient,
        xAxisIndex: dataZoomOrient === 'horizontal' ? [0] : undefined,
        yAxisIndex: dataZoomOrient === 'vertical' ? [0] : undefined,
      }
    ] : undefined,
    legend: {
      show: showLegend,
      orient: getConfigValue(cfg, 'legend.orientation') ?? 'horizontal',
      top: getConfigValue(cfg, 'legend.position') === 'top' ? 0 : undefined,
      bottom: getConfigValue(cfg, 'legend.position') === 'bottom' ? 0 : undefined,
      left: getConfigValue(cfg, 'legend.position') === 'left' ? 0 : undefined,
      right: getConfigValue(cfg, 'legend.position') === 'right' ? 0 : undefined,
      data: series.map((s) => s.name),
      type: 'scroll',
      pageIconSize: 10,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: gridBottom,
      top: toolboxShow ? '14%' : '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
      name: getConfigValue(cfg, 'x_axis.title'),
      nameLocation: 'middle',
      nameGap: effectiveRotation >= 30 ? 50 : 25,
      axisLabel: {
        rotate: effectiveRotation,
        overflow: 'truncate',
        width: effectiveRotation > 0 ? 80 : 120,
        interval: 'auto',
        hideOverlap: true,
      },
      splitLine: {
        show: getConfigValue(cfg, 'x_axis.showGridLines') === true,
      },
    },
    yAxis: {
      type: 'value',
      name: getConfigValue(cfg, 'y_axis.title'),
      nameGap: 45,
      axisLabel: {
        show: getConfigValue(cfg, 'y_axis.showLabels') ?? true,
        formatter: axisLabelFormatter,
        hideOverlap: true,
      },
      min: getConfigValue(cfg, 'y_axis.min') ?? undefined,
      max: getConfigValue(cfg, 'y_axis.max') ?? undefined,
      splitLine: {
        show: getConfigValue(cfg, 'y_axis.showGridLines') !== false,
      },
    },
    series: seriesConfig,
  };
}
