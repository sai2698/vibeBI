import React from 'react';
import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';

type EChartsOption = echarts.EChartsOption;

export interface KPITileChartProps {
  categories?: string[];
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: {
    kpi?: {
      showValue?: boolean;
      showLabel?: boolean;
      showTrend?: boolean;
      showIndicator?: boolean;
      showBorder?: boolean;
      valueFontSize?: number;
      labelFontSize?: number;
      valueFormat?: string;
      trendThreshold?: number;
    };
    color?: {
      positiveColor?: string;
      negativeColor?: string;
      neutralColor?: string;
      backgroundColor?: string;
    };
    layout?: {
      orientation?: 'horizontal' | 'vertical';
      align?: 'left' | 'center' | 'right';
      padding?: number;
    };
  };
  themeMeta?: {
    background?: string;
    text?: string;
    border?: string;
    primary?: string;
    secondary?: string;
    colors?: string[];
  };
  /** Called when user right-clicks the KPI tile */
  onDrillContextMenu?: (e: React.MouseEvent, cellValue: string, colName: string) => void;
}

export const kpiTileChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'kpi',
  sections: [
    {
      id: 'kpi',
      title: 'KPI Settings',
      icon: 'SquareActivity',
      defaultExpanded: true,
      fields: [
        {
          key: 'kpi.showValue',
          label: 'Show Value',
          type: 'boolean',
          defaultValue: true,
          description: 'Display the KPI value',
        },
        {
          key: 'kpi.showLabel',
          label: 'Show Label',
          type: 'boolean',
          defaultValue: true,
          description: 'Display the KPI label',
        },
        {
          key: 'kpi.showTrend',
          label: 'Show Trend',
          type: 'boolean',
          defaultValue: true,
          description: 'Display trend indicator (up/down arrow)',
        },
        {
          key: 'kpi.showIndicator',
          label: 'Show Color Indicator',
          type: 'boolean',
          defaultValue: true,
          description: 'Show color-coded background based on value',
        },
        {
          key: 'kpi.showBorder',
          label: 'Show Left Border',
          type: 'boolean',
          defaultValue: false,
          description: 'Show a left border on the KPI tile',
        },
        {
          key: 'kpi.valueFontSize',
          label: 'Value Font Size',
          type: 'number',
          defaultValue: 32,
          description: 'Font size for KPI value',
        },
        {
          key: 'kpi.labelFontSize',
          label: 'Label Font Size',
          type: 'number',
          defaultValue: 14,
          description: 'Font size for KPI label',
        },
        {
          key: 'kpi.valueFormat',
          label: 'Value Format',
          type: 'text',
          placeholder: '{c}',
          description: 'Template: {c} for value, {n} for name',
        },
        {
          key: 'kpi.trendThreshold',
          label: 'Trend Threshold',
          type: 'number',
          defaultValue: 0,
          description: 'Threshold value to determine positive/negative trend',
        },
      ],
    },
    {
      id: 'color',
      title: 'Color Settings',
      icon: 'Palette',
      defaultExpanded: false,
      fields: [
        {
          key: 'color.positiveColor',
          label: 'Positive Color',
          type: 'color',
          defaultValue: '#22c55e',
          description: 'Color for positive values',
        },
        {
          key: 'color.negativeColor',
          label: 'Negative Color',
          type: 'color',
          defaultValue: '#ef4444',
          description: 'Color for negative values',
        },
        {
          key: 'color.neutralColor',
          label: 'Neutral Color',
          type: 'color',
          defaultValue: '#94a3b8',
          description: 'Color for neutral values',
        },
        {
          key: 'color.backgroundColor',
          label: 'Background Color',
          type: 'color',
          defaultValue: '#f1f5f9',
          description: 'Background color for KPI tile',
        },
      ],
    },
    {
      id: 'layout',
      title: 'Layout Settings',
      icon: 'LayoutGrid',
      defaultExpanded: false,
      fields: [
        {
          key: 'layout.orientation',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ],
          defaultValue: 'vertical',
          description: 'Layout orientation for multiple KPIs',
        },
        {
          key: 'layout.align',
          label: 'Alignment',
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
          defaultValue: 'center',
          description: 'Horizontal alignment of content',
        },
        {
          key: 'layout.padding',
          label: 'Padding',
          type: 'range',
          min: 8,
          max: 32,
          step: 2,
          defaultValue: 16,
          description: 'Padding inside KPI tile (px)',
        },
      ],
    },
  ],
  defaultConfig: {
    kpi: { showValue: true, showLabel: true, showTrend: true, showIndicator: true, showBorder: false, valueFontSize: 32, labelFontSize: 14, valueFormat: '{c}', trendThreshold: 0 },
    color: { positiveColor: '#22c55e', negativeColor: '#ef4444', neutralColor: '#94a3b8', backgroundColor: '#f1f5f9' },
    layout: { orientation: 'vertical', align: 'center', padding: 16 },
  },
});

export function buildKPITileChartOptions(
  _props: KPITileChartProps
): EChartsOption {
  // This function is kept for compatibility but KPI is rendered as React component
  return { series: [] };
}

export const KPITileChart: React.FC<KPITileChartProps> = ({
  series,
  dimensions,
  visualConfig = {},
  themeMeta,
  onDrillContextMenu,
}) => {
  const cfg = visualConfig;
  
  // Extract value from various data formats
  let value: number | string = 0;
  let label = 'Metric';
  
  // Priority 1: series[0].value (standard format)
  if (series[0]?.value !== undefined) {
    value = series[0].value;
    label = series[0].name || 'Metric';
  }
  // Priority 2: series[0].data[0] (array format)
  else if (series[0]?.data?.[0] !== undefined) {
    value = series[0].data[0];
    label = series[0].name || 'Metric';
  }
  // Priority 3: dimensions[0].data[0] (dimension format - backend format)
  else if (dimensions?.[0]?.data?.[0] !== undefined) {
    value = dimensions[0].data[0];
    label = dimensions[0].name || 'Metric';
  }
  
  const isPositive = value >= (getConfigValue(cfg, 'kpi.trendThreshold') ?? 0);
  const primaryColor = isPositive 
    ? (getConfigValue(cfg, 'color.positiveColor') ?? '#22c55e')
    : (getConfigValue(cfg, 'color.negativeColor') ?? '#ef4444');

  const formattedValue = typeof value === 'number'
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : String(value);

  const showBorder = getConfigValue(cfg, 'kpi.showBorder') ?? false;

  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full p-2 text-center overflow-hidden transition-colors duration-300 ${showBorder ? 'border-l-4' : ''}`}
      style={{
        backgroundColor: themeMeta?.background || (getConfigValue(cfg, 'color.backgroundColor') ?? '#f1f5f9'),
        borderLeftColor: showBorder ? (themeMeta?.primary || primaryColor) : undefined,
        cursor: onDrillContextMenu ? 'context-menu' : undefined,
      }}
      onContextMenu={onDrillContextMenu ? (e) => onDrillContextMenu(e, formattedValue, label) : undefined}
    >
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full gap-1">
        {(getConfigValue(cfg, 'kpi.showLabel') ?? true) && (
          <span
            className="uppercase tracking-[0.2em] w-full line-clamp-2 px-2"
            style={{
              fontSize: 'clamp(10px, 2cqw, 14px)',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif',
              color: themeMeta?.secondary || '#64748b',
              lineHeight: '1.2',
            }}
          >
            {label}
          </span>
        )}
        {(getConfigValue(cfg, 'kpi.showValue') ?? true) && (
          <span
            className="tracking-tighter w-full px-2 break-all"
            style={{
              fontSize: 'clamp(24px, 15cqw, 96px)',
              fontWeight: 'black',
              fontFamily: 'Inter, sans-serif',
              color: themeMeta?.primary || primaryColor,
              lineHeight: '1',
            }}
          >
            {formattedValue}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPITileChart;
