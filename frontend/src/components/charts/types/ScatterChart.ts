import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface ScatterChartOptions {
  categories: string[];
  series: Array<{
    name: string;
    data: Array<[number, number]>;
  }>;
  visualConfig?: {
    x_axis?: {
      title?: string;
      labelRotation?: number;
      truncate?: boolean;
      min?: number | null;
      max?: number | null;
    };
    y_axis?: {
      title?: string;
      showLabels?: boolean;
      min?: number | null;
      max?: number | null;
    };
    legend?: {
      show?: boolean;
      orientation?: 'horizontal' | 'vertical';
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    scatter?: {
      pointSize?: number;
      pointShape?: string;
      showEffect?: boolean;
    };
    colorPalette?: string[];
  };
}

export const scatterChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'scatter',
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
          defaultValue: true,
          description: 'Show vertical grid lines',
        },
        {
          key: 'x_axis.min',
          label: 'Minimum Value',
          type: 'number',
          placeholder: 'Auto',
          description: 'Minimum X-axis value (leave empty for auto)',
        },
        {
          key: 'x_axis.max',
          label: 'Maximum Value',
          type: 'number',
          placeholder: 'Auto',
          description: 'Maximum X-axis value (leave empty for auto)',
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
          key: 'y_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: true,
          description: 'Show horizontal grid lines',
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
          defaultValue: 'bottom',
          description: 'Legend position on the chart',
        },
      ],
    },
    {
      id: 'scatter',
      title: 'Scatter Settings',
      icon: 'CircleDot',
      defaultExpanded: false,
      fields: [
        {
          key: 'scatter.pointSize',
          label: 'Point Size',
          type: 'range',
          min: 5,
          max: 30,
          step: 1,
          defaultValue: 10,
          description: 'Size of scatter points',
        },
        {
          key: 'scatter.pointShape',
          label: 'Point Shape',
          type: 'select',
          options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Square', value: 'square' },
            { label: 'Diamond', value: 'diamond' },
            { label: 'Triangle', value: 'triangle' },
            { label: 'Pin', value: 'pin' },
            { label: 'Arrow', value: 'arrow' },
          ],
          defaultValue: 'circle',
          description: 'Shape of scatter points',
        },
        {
          key: 'scatter.showEffect',
          label: 'Show Ripple Effect',
          type: 'boolean',
          defaultValue: true,
          description: 'Display animated ripple effect on points',
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
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ],
          defaultValue: 'horizontal',
          description: 'Zoom scrollbar orientation',
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
    x_axis: { title: '', labelRotation: 0, truncate: true, min: null, max: null, showGridLines: true },
    y_axis: { title: '', showLabels: true, min: null, max: null, showGridLines: true },
    legend: { show: true, orientation: 'horizontal', position: 'bottom' },
    scatter: { pointSize: 10, pointShape: 'circle', showEffect: true },
    dataZoom: { show: false, type: 'slider', orient: 'horizontal' },
    toolbox: { show: false },
    animation: { duration: 1000 },
  },
});

export function buildScatterChartOptions({
  categories,
  series,
  visualConfig = {},
}: ScatterChartOptions): EChartsOption {
  const cfg = visualConfig;

  // Transform categories and series into scatter data format
  const scatterSeries = series.map((s) => {
    const data = s.data.map((point, index) => {
      if (Array.isArray(point)) {
        return point; // Already in [x, y] format
      }
      return [categories[index] || index, point[1] ?? point] as [number, number];
    });

    const baseSeries: any = {
      name: s.name,
      type: 'scatter',
      data: data,
      symbolSize: getConfigValue(cfg, 'scatter.pointSize') ?? 10,
      symbol: getConfigValue(cfg, 'scatter.pointShape') ?? 'circle',
    };

    // Ripple effect
    if (getConfigValue(cfg, 'scatter.showEffect')) {
      baseSeries.animate = true;
    }

    return baseSeries;
  });

  const showDataZoom = getConfigValue(cfg, 'dataZoom.show');
  const dataZoomType = getConfigValue(cfg, 'dataZoom.type') || 'slider';
  const dataZoomOrient = getConfigValue(cfg, 'dataZoom.orient') || 'horizontal';

  const colors = visualConfig?.colorPalette;

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
    dataZoom: showDataZoom ? [
      {
        type: dataZoomType,
        orient: dataZoomOrient,
        xAxisIndex: dataZoomOrient === 'horizontal' ? [0] : undefined,
        yAxisIndex: dataZoomOrient === 'vertical' ? [0] : undefined,
      }
    ] : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
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
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: getConfigValue(cfg, 'x_axis.title'),
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: {
        rotate: getConfigValue(cfg, 'x_axis.labelRotation') ?? 0,
        overflow: getConfigValue(cfg, 'x_axis.truncate') ? 'truncate' : 'break',
      },
      splitLine: {
        show: getConfigValue(cfg, 'x_axis.showGridLines') !== false,
      },
      min: getConfigValue(cfg, 'x_axis.min') ?? undefined,
      max: getConfigValue(cfg, 'x_axis.max') ?? undefined,
    },
    yAxis: {
      type: 'value',
      name: getConfigValue(cfg, 'y_axis.title'),
      axisLabel: {
        show: getConfigValue(cfg, 'y_axis.showLabels') ?? true,
      },
      splitLine: {
        show: getConfigValue(cfg, 'y_axis.showGridLines') !== false,
      },
      min: getConfigValue(cfg, 'y_axis.min') ?? undefined,
      max: getConfigValue(cfg, 'y_axis.max') ?? undefined,
    },
    series: scatterSeries,
  };
}
