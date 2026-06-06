import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';

type EChartsOption = echarts.EChartsOption;

interface LineChartOptions {
  categories?: string[];
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
      showGridLines?: boolean;
    };
    legend?: {
      show?: boolean;
      orientation?: 'horizontal' | 'vertical';
    };
    dataLabels?: {
      show?: boolean;
      position?: string;
    };
    line?: {
      stacking?: boolean;
      smooth?: boolean;
      showPoints?: boolean;
      step?: false | 'start' | 'middle' | 'end';
      symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
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

// Line Chart Configuration Schema
export const lineChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'line',
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
          description: 'Truncate X-axis labels that are too long',
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
      defaultExpanded: true,
      fields: [
        {
          key: 'y_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter Y-axis title',
          description: 'Title displayed beside the Y-axis',
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
      defaultExpanded: true,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display chart legend',
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
          description: 'Legend orientation',
        },
      ],
    },
    {
      id: 'dataLabels',
      title: 'Data Labels',
      icon: 'Type',
      defaultExpanded: true,
      fields: [
        {
          key: 'dataLabels.show',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Display values on lines',
        },
        {
          key: 'dataLabels.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Inside', value: 'inside' },
            { label: 'Right', value: 'right' },
            { label: 'Left', value: 'left' },
          ],
          defaultValue: 'top',
          description: 'Label position on lines',
        },
      ],
    },
    {
      id: 'line',
      title: 'Line Settings',
      icon: 'LineChart',
      defaultExpanded: false,
      fields: [
        {
          key: 'line.stacking',
          label: 'Stacked Lines',
          type: 'boolean',
          defaultValue: false,
          description: 'Stack multiple series on top of each other',
        },
        {
          key: 'line.smooth',
          label: 'Smooth Curves',
          type: 'boolean',
          defaultValue: false,
          description: 'Use smooth curves instead of straight lines',
        },
        {
          key: 'line.showPoints',
          label: 'Show Points',
          type: 'boolean',
          defaultValue: true,
          description: 'Display data points on the line',
        },
        {
          key: 'line.step',
          label: 'Step Line',
          type: 'select',
          options: [
            { label: 'Disabled', value: '' },
            { label: 'Start Step', value: 'start' },
            { label: 'Middle Step', value: 'middle' },
            { label: 'End Step', value: 'end' },
          ],
          defaultValue: '',
          description: 'Turn the line into a step chart',
        },
        {
          key: 'line.symbol',
          label: 'Point Marker Style',
          type: 'select',
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Rectangle', value: 'rect' },
            { label: 'Round Rectangle', value: 'roundRect' },
            { label: 'Triangle', value: 'triangle' },
            { label: 'Diamond', value: 'diamond' },
            { label: 'Pin', value: 'pin' },
            { label: 'Arrow', value: 'arrow' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'circle',
          description: 'Choose shape for data points',
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
    x_axis: {
      title: '',
      labelRotation: 0,
      truncate: true,
      showGridLines: false,
    },
    y_axis: {
      title: '',
      showGridLines: true,
    },
    legend: {
      show: true,
      orientation: 'horizontal',
    },
    dataLabels: {
      show: false,
      position: 'top',
    },
    line: {
      stacking: false,
      smooth: false,
      showPoints: true,
      step: '',
      symbol: 'circle',
    },
    dataZoom: {
      show: false,
      type: 'slider',
      orient: 'horizontal',
    },
    toolbox: {
      show: false,
    },
    animation: {
      duration: 1000,
    },
  },
});

export function buildLineChartOptions({
  categories,
  series,
  visualConfig,
}: LineChartOptions): EChartsOption {
  const cfg = {
    xAxisTitle: getConfigValue(visualConfig, 'x_axis.title'),
    xAxisRotation: getConfigValue(visualConfig, 'x_axis.labelRotation') || 0,
    xAxisTruncate: getConfigValue(visualConfig, 'x_axis.truncate') !== false,
    xAxisShowGridLines: getConfigValue(visualConfig, 'x_axis.showGridLines') === true,
    yAxisTitle: getConfigValue(visualConfig, 'y_axis.title'),
    yAxisShowGridLines: getConfigValue(visualConfig, 'y_axis.showGridLines') !== false,
    showLegend: getConfigValue(visualConfig, 'legend.show') !== false,
    legendOrientation: getConfigValue(visualConfig, 'legend.orientation') || 'horizontal',
    showLabels: getConfigValue(visualConfig, 'dataLabels.show') !== false,
    labelPosition: getConfigValue(visualConfig, 'dataLabels.position') || 'top',
    stacking: getConfigValue(visualConfig, 'line.stacking') === true,
    smooth: getConfigValue(visualConfig, 'line.smooth') === true,
    showPoints: getConfigValue(visualConfig, 'line.showPoints') !== false,
    step: getConfigValue(visualConfig, 'line.step') || undefined,
    symbol: getConfigValue(visualConfig, 'line.symbol') || 'circle',
    dataZoomShow: getConfigValue(visualConfig, 'dataZoom.show') === true,
    dataZoomType: getConfigValue(visualConfig, 'dataZoom.type') || 'slider',
    dataZoomOrient: getConfigValue(visualConfig, 'dataZoom.orient') || 'horizontal',
    toolboxShow: getConfigValue(visualConfig, 'toolbox.show') === true,
    animationDuration: getConfigValue(visualConfig, 'animation.duration') ?? 1000,
    colorPalette: visualConfig?.colorPalette,
  };

  const colors = cfg.colorPalette;
  const showLegend = cfg.showLegend;

  return {
    tooltip: { trigger: 'axis' },
    color: colors,
    animationDuration: cfg.animationDuration,
    toolbox: {
      show: cfg.toolboxShow,
      feature: {
        saveAsImage: { show: true },
        dataView: { show: true, readOnly: false },
        restore: { show: true },
      },
    },
    dataZoom: cfg.dataZoomShow ? [
      {
        show: true,
        type: cfg.dataZoomType as 'slider' | 'inside',
        orient: cfg.dataZoomOrient as 'horizontal' | 'vertical',
        xAxisIndex: cfg.dataZoomOrient === 'horizontal' ? [0] : undefined,
        yAxisIndex: cfg.dataZoomOrient === 'vertical' ? [0] : undefined,
      }
    ] : undefined,
    legend: {
      show: showLegend,
      bottom: 0,
      orient: cfg.legendOrientation,
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: showLegend ? '12%' : '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      name: cfg.xAxisTitle || undefined,
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
      axisLabel: {
        rotate: cfg.xAxisRotation,
        overflow: cfg.xAxisTruncate ? 'truncate' : undefined,
      } as any,
      splitLine: {
        show: cfg.xAxisShowGridLines,
      },
    },
    yAxis: {
      type: 'value',
      name: cfg.yAxisTitle || undefined,
      nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b', align: 'right' },
      splitLine: {
        show: cfg.yAxisShowGridLines,
      },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.data || [],
      stack: cfg.stacking ? 'total' : undefined,
      label: { show: cfg.showLabels, position: cfg.labelPosition as any },
      smooth: cfg.smooth,
      step: cfg.step || undefined,
      symbol: cfg.showPoints ? cfg.symbol : 'none',
      symbolSize: 6,
    })),
  };
}
