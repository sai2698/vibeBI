import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { smartCompareCategories } from '../../../utils/chartUtils';

type EChartsOption = echarts.EChartsOption;

interface ComboChartOptions {
  categories?: string[];
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: any;
}

export const comboChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'combo',
  sections: [
    {
      id: 'combo',
      title: 'Combo Settings',
      icon: 'Layers',
      defaultExpanded: true,
      fields: [
        {
          key: 'combo.measure1Type',
          label: 'Measure 1 Type',
          type: 'select',
          options: [{ label: 'Bar', value: 'bar' }, { label: 'Line', value: 'line' }],
          defaultValue: 'bar',
          description: 'Chart type for the first measure',
        },
        {
          key: 'combo.measure1Axis',
          label: 'Measure 1 Axis',
          type: 'select',
          options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
          defaultValue: 'left',
        },
        {
          key: 'combo.measure2Type',
          label: 'Measure 2 Type',
          type: 'select',
          options: [{ label: 'Bar', value: 'bar' }, { label: 'Line', value: 'line' }],
          defaultValue: 'line',
          description: 'Chart type for the second measure',
        },
        {
          key: 'combo.measure2Axis',
          label: 'Measure 2 Axis',
          type: 'select',
          options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
          defaultValue: 'right',
        },
        {
          key: 'combo.measure3Type',
          label: 'Measure 3 Type',
          type: 'select',
          options: [{ label: 'Bar', value: 'bar' }, { label: 'Line', value: 'line' }],
          defaultValue: 'bar',
        },
        {
          key: 'combo.measure3Axis',
          label: 'Measure 3 Axis',
          type: 'select',
          options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
          defaultValue: 'left',
        },
        {
          key: 'combo.measure4Type',
          label: 'Measure 4 Type',
          type: 'select',
          options: [{ label: 'Bar', value: 'bar' }, { label: 'Line', value: 'line' }],
          defaultValue: 'line',
        },
        {
          key: 'combo.measure4Axis',
          label: 'Measure 4 Axis',
          type: 'select',
          options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
          defaultValue: 'right',
        },
        {
          key: 'combo.stacking',
          label: 'Stack Bars/Lines',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'combo.barWidth',
          label: 'Bar Width',
          type: 'range',
          min: 10,
          max: 100,
          step: 5,
          defaultValue: 40,
        },
        {
          key: 'combo.smooth',
          label: 'Smooth Lines',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
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
        },
        {
          key: 'x_axis.labelRotation',
          label: 'Label Rotation',
          type: 'range',
          min: 0,
          max: 90,
          step: 15,
          defaultValue: 0,
        },
        {
          key: 'x_axis.truncate',
          label: 'Truncate Long Labels',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'x_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: false,
        },
      ],
    },
    {
      id: 'y_axis',
      title: 'Left Y-Axis',
      icon: 'MoveVertical',
      defaultExpanded: true,
      fields: [
        {
          key: 'y_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter Left Y-axis title',
        },
        {
          key: 'y_axis.showGridLines',
          label: 'Show Grid Lines',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'y_axis_right',
      title: 'Right Y-Axis',
      icon: 'MoveVertical',
      defaultExpanded: true,
      fields: [
        {
          key: 'y_axis_right.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter Right Y-axis title',
        },
        {
          key: 'y_axis_right.show',
          label: 'Show Right Axis',
          type: 'boolean',
          defaultValue: true,
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
        },
      ],
    },
    {
      id: 'dataLabels',
      title: 'Data Labels',
      icon: 'Type',
      defaultExpanded: false,
      fields: [
        {
          key: 'dataLabels.show',
          label: 'Show Labels',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'dataLabels.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Inside', value: 'inside' },
          ],
          defaultValue: 'top',
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
        },
      ],
    },
    {
      id: 'sorting',
      title: 'Sorting',
      icon: 'ArrowUpDown',
      defaultExpanded: false,
      fields: [
        {
          key: 'sorting.mode',
          label: 'Sort By',
          type: 'select',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Value (Ascending)', value: 'value_asc' },
            { label: 'Value (Descending)', value: 'value_desc' },
            { label: 'Category (A-Z)', value: 'category_asc' },
            { label: 'Category (Z-A)', value: 'category_desc' },
          ],
          defaultValue: 'none',
        },
      ],
    },
  ],
  defaultConfig: {
    combo: {
      measure1Type: 'bar',
      measure1Axis: 'left',
      measure2Type: 'line',
      measure2Axis: 'right',
      measure3Type: 'bar',
      measure3Axis: 'left',
      measure4Type: 'line',
      measure4Axis: 'right',
      stacking: false,
      barWidth: 40,
      smooth: true,
    },
    x_axis: { title: '', labelRotation: 0, truncate: true, showGridLines: false },
    y_axis: { title: '', showGridLines: true },
    y_axis_right: { title: '', show: true },
    legend: { show: true, orientation: 'horizontal' },
    dataLabels: { show: false, position: 'top' },
    dataZoom: { show: false },
    toolbox: { show: false },
    animation: { duration: 1000 },
    sorting: { mode: 'none' },
  },
});

export function buildComboChartOptions({
  categories,
  series,
  visualConfig,
}: ComboChartOptions): EChartsOption {
  const sortMode = getConfigValue(visualConfig, 'sorting.mode') || 'none';

  let displayCategories = categories ? [...categories] : [];
  let displaySeries = series ? series.map(s => ({ ...s, data: s.data ? [...s.data] : [] })) : [];

  if (sortMode !== 'none' && displayCategories.length > 0 && displaySeries.length > 0) {
    let indices = Array.from({ length: displayCategories.length }, (_, i) => i);

    indices.sort((a, b) => {
      if (sortMode.startsWith('value')) {
        let valA = Number(displaySeries[0]?.data?.[a]) || 0;
        let valB = Number(displaySeries[0]?.data?.[b]) || 0;
        if (valA === valB) return 0;
        return sortMode === 'value_asc' ? valA - valB : valB - valA;
      } else if (sortMode.startsWith('category')) {
        let catA = String(displayCategories[a]);
        let catB = String(displayCategories[b]);
        const cmp = smartCompareCategories(catA, catB);
        return sortMode === 'category_asc' ? cmp : -cmp;
      }
      return 0;
    });

    displayCategories = indices.map(i => categories![i]);
    displaySeries = series.map(s => ({
      ...s,
      data: s.data ? indices.map(i => s.data![i]) : [],
    }));
  }

  const cfg = {
    xAxisTitle: getConfigValue(visualConfig, 'x_axis.title'),
    xAxisRotation: getConfigValue(visualConfig, 'x_axis.labelRotation') || 0,
    xAxisTruncate: getConfigValue(visualConfig, 'x_axis.truncate') !== false,
    xAxisShowGridLines: getConfigValue(visualConfig, 'x_axis.showGridLines') === true,
    
    yAxisTitle: getConfigValue(visualConfig, 'y_axis.title'),
    yAxisShowGridLines: getConfigValue(visualConfig, 'y_axis.showGridLines') !== false,
    
    yAxisRightTitle: getConfigValue(visualConfig, 'y_axis_right.title'),
    yAxisRightShow: getConfigValue(visualConfig, 'y_axis_right.show') !== false,

    showLegend: getConfigValue(visualConfig, 'legend.show') !== false,
    legendOrientation: getConfigValue(visualConfig, 'legend.orientation') || 'horizontal',
    
    showLabels: getConfigValue(visualConfig, 'dataLabels.show') === true,
    labelPosition: getConfigValue(visualConfig, 'dataLabels.position') || 'top',
    
    stacking: getConfigValue(visualConfig, 'combo.stacking') === true,
    barWidth: getConfigValue(visualConfig, 'combo.barWidth') || 40,
    smooth: getConfigValue(visualConfig, 'combo.smooth') !== false,
    
    dataZoomShow: getConfigValue(visualConfig, 'dataZoom.show') === true,
    toolboxShow: getConfigValue(visualConfig, 'toolbox.show') === true,
    animationDuration: getConfigValue(visualConfig, 'animation.duration') ?? 1000,
    colorPalette: visualConfig?.colorPalette,
  };

  const getMeasureConfig = (index: number) => {
    const idx = index + 1;
    return {
      type: getConfigValue(visualConfig, `combo.measure${idx}Type`) || (idx % 2 === 0 ? 'line' : 'bar'),
      axis: getConfigValue(visualConfig, `combo.measure${idx}Axis`) || (idx % 2 === 0 ? 'right' : 'left'),
    };
  };

  return {
    tooltip: { trigger: 'axis' },
    color: cfg.colorPalette,
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
      { show: true, type: 'slider', orient: 'horizontal', xAxisIndex: [0] }
    ] : undefined,
    legend: {
      show: cfg.showLegend,
      bottom: 0,
      orient: cfg.legendOrientation,
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: cfg.yAxisRightShow ? '3%' : '4%',
      bottom: cfg.showLegend ? '12%' : '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: displayCategories,
      name: cfg.xAxisTitle || undefined,
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
      axisLabel: {
        rotate: cfg.xAxisRotation,
        overflow: cfg.xAxisTruncate ? 'truncate' : undefined,
      } as any,
      splitLine: { show: cfg.xAxisShowGridLines },
    },
    yAxis: [
      {
        type: 'value',
        name: cfg.yAxisTitle || undefined,
        nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b', align: 'right' },
        splitLine: { show: cfg.yAxisShowGridLines },
        position: 'left',
      },
      {
        type: 'value',
        name: cfg.yAxisRightTitle || undefined,
        nameTextStyle: { fontSize: 11, fontWeight: 'bold', color: '#64748b', align: 'left' },
        splitLine: { show: false }, // avoid overlapping grid lines
        position: 'right',
        show: cfg.yAxisRightShow,
      }
    ],
    series: displaySeries.map((s, idx) => {
      const mCfg = getMeasureConfig(idx);
      const isLine = mCfg.type === 'line';
      const isBar = mCfg.type === 'bar';
      
      return {
        name: s.name,
        type: isLine ? 'line' : 'bar',
        data: s.data || [],
        yAxisIndex: mCfg.axis === 'right' ? 1 : 0,
        stack: cfg.stacking ? (isBar ? 'bar-stack' : 'line-stack') : undefined,
        label: { show: cfg.showLabels, position: cfg.labelPosition as any },
        barMaxWidth: isBar ? cfg.barWidth : undefined,
        smooth: isLine ? cfg.smooth : undefined,
        symbolSize: isLine ? 6 : undefined,
        itemStyle: isBar ? { borderRadius: [4, 4, 0, 0] } : undefined,
      };
    }),
  };
}
