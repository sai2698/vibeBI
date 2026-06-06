import * as echarts from 'echarts';
import { 
  createChartConfigSchema, 
  type ChartConfigSchema,
  getConfigValue 
} from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface ChordChartOptions {
  categories: string[]; // Nodes
  series: Array<{
    name: string;
    data: Array<{
      name: string;
      value: number;
    }>;
    links?: Array<{
      source: string;
      target: string;
      value: number;
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
      fontSize?: number;
      color?: string;
      rotateLabel?: boolean;
    };
    chord?: {
      sort?: 'none' | 'ascending' | 'descending';
      radius?: [number, number];
      endAngle?: number;
      showEdge?: boolean;
      edgeWidth?: number;
      edgeColor?: string;
      padding?: number;
      clockwise?: boolean;
    };
  };
}

export const chordChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'chord',
  sections: [
    {
      id: 'legend',
      title: 'Legend',
      icon: 'List',
      defaultExpanded: false,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display legend',
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
          description: 'Legend position',
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
          defaultValue: true,
          description: 'Display node labels',
        },
        {
          key: 'dataLabels.formatter',
          label: 'Formatter',
          type: 'text',
          placeholder: '{b}',
          description: 'Template: {b} for name, {c} for value',
        },
        {
          key: 'dataLabels.fontSize',
          label: 'Font Size',
          type: 'number',
          defaultValue: 12,
          description: 'Label font size',
        },
        {
          key: 'dataLabels.color',
          label: 'Color',
          type: 'color',
          defaultValue: '#1e293b',
          description: 'Label color',
        },
        {
          key: 'dataLabels.rotateLabel',
          label: 'Rotate Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Rotate labels to fit',
        },
      ],
    },
    {
      id: 'chord',
      title: 'Chord Settings',
      icon: 'CircleDot',
      defaultExpanded: true,
      fields: [
        {
          key: 'chord.sort',
          label: 'Sort Order',
          type: 'select',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Ascending', value: 'ascending' },
            { label: 'Descending', value: 'descending' },
          ],
          defaultValue: 'descending',
          description: 'Sort order for nodes',
        },
        {
          key: 'chord.radius',
          label: 'Radius Range',
          type: 'select',
          options: [
            { label: 'Small (40%, 70%)', value: 'small' },
            { label: 'Medium (30%, 80%)', value: 'medium' },
            { label: 'Large (20%, 90%)', value: 'large' },
          ],
          defaultValue: 'medium',
          description: 'Inner and outer radius percentages',
        },
        {
          key: 'chord.endAngle',
          label: 'End Angle',
          type: 'number',
          defaultValue: 360,
          description: 'End angle in degrees (default 360)',
        },
        {
          key: 'chord.showEdge',
          label: 'Show Edges',
          type: 'boolean',
          defaultValue: true,
          description: 'Display chord edges/flows',
        },
        {
          key: 'chord.edgeWidth',
          label: 'Edge Width',
          type: 'number',
          defaultValue: 1,
          description: 'Width of edge lines',
        },
        {
          key: 'chord.edgeColor',
          label: 'Edge Color',
          type: 'select',
          options: [
            { label: 'Source Node Color', value: 'source' },
            { label: 'Target Node Color', value: 'target' },
            { label: 'Gray', value: 'gray' },
          ],
          defaultValue: 'source',
          description: 'Color of edges',
        },
        {
          key: 'chord.padding',
          label: 'Padding',
          type: 'number',
          defaultValue: 30,
          description: 'Padding between groups (px)',
        },
        {
          key: 'chord.clockwise',
          label: 'Clockwise',
          type: 'boolean',
          defaultValue: true,
          description: 'Arrange nodes clockwise',
        },
      ],
    },
  ],
  defaultConfig: {
    legend: { show: true, position: 'right' },
    dataLabels: { show: true, formatter: '{b}', fontSize: 12, color: '#1e293b', rotateLabel: false },
    chord: { sort: 'descending', radius: 'medium', endAngle: 360, showEdge: true, edgeWidth: 1, edgeColor: 'source', padding: 30, clockwise: true },
  },
});

export function buildChordChartOptions({
  categories,
  series,
  visualConfig = {},
}: ChordChartOptions): EChartsOption {
  const cfg = visualConfig;
  
  const radiusMap: Record<string, [number, number]> = {
    small: [40, 70],
    medium: [30, 80],
    large: [20, 90],
  };

  const edgeColorMap: Record<string, string | 'source' | 'target'> = {
    source: 'source',
    target: 'target',
    gray: '#94a3b8',
  };

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}: ${params.data.value}`;
        }
        return `${params.name}: ${params.value}`;
      },
    },
    legend: {
      show: getConfigValue(cfg, 'legend.show') ?? true,
      top: getConfigValue(cfg, 'legend.position') ?? 'right',
      data: categories,
    },
    series: [
      {
        type: 'chord',
        radius: radiusMap[getConfigValue(cfg, 'chord.radius') ?? 'medium'],
        endAngle: getConfigValue(cfg, 'chord.endAngle') ?? 360,
        padding: getConfigValue(cfg, 'chord.padding') ?? 30,
        sort: getConfigValue(cfg, 'chord.sort') ?? 'descending',
        clockwise: getConfigValue(cfg, 'chord.clockwise') ?? true,
        label: {
          show: getConfigValue(cfg, 'dataLabels.show') ?? true,
          formatter: getConfigValue(cfg, 'dataLabels.formatter'),
          fontSize: getConfigValue(cfg, 'dataLabels.fontSize') ?? 12,
          color: getConfigValue(cfg, 'dataLabels.color') ?? '#1e293b',
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4,
          },
        },
        edgeLabel: {
          fontSize: 10,
        },
        edgeStyle: {
          width: getConfigValue(cfg, 'chord.edgeWidth') ?? 1,
          curveness: 0.25,
          color: (params: any) => {
            const colorMode = getConfigValue(cfg, 'chord.edgeColor') ?? 'source';
            if (colorMode === 'source') return params.data.sourceColor;
            if (colorMode === 'target') return params.data.targetColor;
            return '#94a3b8';
          },
        },
        data: series[0]?.data ?? [],
        links: series[0]?.links ?? [],
      },
    ],
  };
}
