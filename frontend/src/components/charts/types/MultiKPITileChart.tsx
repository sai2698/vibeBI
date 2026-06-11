import React from 'react';
import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { 
  Calendar, ShoppingCart, Users, Eye, DollarSign, Activity, 
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, ChevronUp, ChevronDown,
  Briefcase, Target, Zap, Clock, Star, Heart, CheckCircle, BarChart2,
  PieChart, LineChart, Globe, MapPin, Hash, LayoutGrid, Box, Server
} from 'lucide-react';

type EChartsOption = echarts.EChartsOption;

export interface MultiKPITileChartProps {
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: any;
  themeMeta?: any;
  /** Called when user right-clicks the KPI tile */
  onDrillContextMenu?: (e: React.MouseEvent, cellValue: string, colName: string) => void;
}

const ICON_MAP: Record<string, React.FC<any>> = {
  'Calendar': Calendar, 'ShoppingCart': ShoppingCart, 'Users': Users, 'Eye': Eye, 
  'DollarSign': DollarSign, 'Activity': Activity, 'TrendingUp': TrendingUp, 
  'TrendingDown': TrendingDown, 'ArrowUp': ArrowUp, 'ArrowDown': ArrowDown, 
  'ChevronUp': ChevronUp, 'ChevronDown': ChevronDown, 'Briefcase': Briefcase, 
  'Target': Target, 'Zap': Zap, 'Clock': Clock, 'Star': Star, 'Heart': Heart, 
  'CheckCircle': CheckCircle, 'BarChart2': BarChart2, 'PieChart': PieChart,
  'LineChart': LineChart, 'Globe': Globe, 'MapPin': MapPin, 'Hash': Hash,
  'LayoutGrid': LayoutGrid, 'Box': Box, 'Server': Server
};

const iconOptions = [
  { label: 'None', value: '' },
  { label: 'Calendar', value: 'Calendar' },
  { label: 'Shopping Cart', value: 'ShoppingCart' },
  { label: 'Users', value: 'Users' },
  { label: 'Eye', value: 'Eye' },
  { label: 'Dollar Sign', value: 'DollarSign' },
  { label: 'Activity', value: 'Activity' },
  { label: 'Briefcase', value: 'Briefcase' },
  { label: 'Target', value: 'Target' },
  { label: 'Zap', value: 'Zap' },
  { label: 'Clock', value: 'Clock' },
  { label: 'Star', value: 'Star' },
  { label: 'Heart', value: 'Heart' },
  { label: 'Check Circle', value: 'CheckCircle' },
  { label: 'Bar Chart', value: 'BarChart2' },
  { label: 'Pie Chart', value: 'PieChart' },
  { label: 'Line Chart', value: 'LineChart' },
  { label: 'Globe', value: 'Globe' },
  { label: 'Map Pin', value: 'MapPin' },
  { label: 'Hash', value: 'Hash' },
  { label: 'Layout Grid', value: 'LayoutGrid' },
  { label: 'Box', value: 'Box' },
  { label: 'Server', value: 'Server' },
];

export const multiKpiTileChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'multikpi',
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
        },
        {
          key: 'kpi.showLabel',
          label: 'Show Label',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'kpi.valueFormat',
          label: 'Number Format',
          type: 'select',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Compact (K/M/B)', value: 'compact' },
            { label: 'Indian (Lakhs/Cr)', value: 'indian' },
            { label: 'Percentage (%)', value: 'percentage' },
            { label: 'Currency ($)', value: 'currency' },
          ],
          defaultValue: 'standard',
        },
        {
          key: 'kpi.icon1',
          label: 'Icon 1',
          type: 'select',
          options: iconOptions,
          defaultValue: '',
        },
        {
          key: 'kpi.icon2',
          label: 'Icon 2',
          type: 'select',
          options: iconOptions,
          defaultValue: '',
        },
        {
          key: 'kpi.icon3',
          label: 'Icon 3',
          type: 'select',
          options: iconOptions,
          defaultValue: '',
        },
        {
          key: 'kpi.icon4',
          label: 'Icon 4',
          type: 'select',
          options: iconOptions,
          defaultValue: '',
        },
        {
          key: 'kpi.icon5',
          label: 'Icon 5',
          type: 'select',
          options: iconOptions,
          defaultValue: '',
        },
        {
          key: 'kpi.icon6',
          label: 'Icon 6',
          type: 'select',
          options: iconOptions,
          defaultValue: '',
        },
        {
          key: 'kpi.valueFontSize',
          label: 'Primary Value Font Size',
          type: 'number',
          defaultValue: 36,
        },
        {
          key: 'kpi.labelFontSize',
          label: 'Label Font Size',
          type: 'number',
          defaultValue: 13,
        },
        {
          key: 'kpi.trendThreshold',
          label: 'Trend Threshold',
          type: 'number',
          defaultValue: 0,
          description: 'Value that divides positive/negative',
        },
      ],
    },
    {
      id: 'secondary',
      title: 'Secondary KPI',
      icon: 'ArrowUpDown',
      defaultExpanded: true,
      fields: [
        {
          key: 'secondary.enabled',
          label: 'Enable Secondary KPI',
          type: 'boolean',
          defaultValue: false,
          description: 'Group measures in pairs (Primary + Secondary)',
        },
        {
          key: 'secondary.position',
          label: 'Position',
          type: 'select',
          options: [
            { label: 'Bottom', value: 'bottom' },
            { label: 'Right', value: 'right' },
            { label: 'Top', value: 'top' },
            { label: 'Left', value: 'left' },
          ],
          defaultValue: 'bottom',
        },
        {
          key: 'secondary.valueFormat',
          label: 'Number Format',
          type: 'select',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Compact (K/M/B)', value: 'compact' },
            { label: 'Indian (Lakhs/Cr)', value: 'indian' },
            { label: 'Percentage (%)', value: 'percentage' },
          ],
          defaultValue: 'percentage',
        },
        {
          key: 'secondary.fontSize',
          label: 'Font Size',
          type: 'number',
          defaultValue: 16,
        },
        {
          key: 'secondary.trendIconType',
          label: 'Trend Icon',
          type: 'select',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Triangles (▴/▾)', value: 'triangle' },
            { label: 'Arrows (↑/↓)', value: 'arrow' },
            { label: 'Lucide (Trending)', value: 'lucide_trending' },
            { label: 'Plus/Minus (+/-)', value: 'plus_minus' },
          ],
          defaultValue: 'triangle',
        },
      ]
    },
    {
      id: 'color',
      title: 'Color Settings',
      icon: 'Palette',
      defaultExpanded: false,
      fields: [
        {
          key: 'color.primaryValueColor',
          label: 'Primary Value Color',
          type: 'color',
          defaultValue: '#475569',
        },
        {
          key: 'color.positiveColor',
          label: 'Positive Trend Color',
          type: 'color',
          defaultValue: '#22c55e',
        },
        {
          key: 'color.negativeColor',
          label: 'Negative Trend Color',
          type: 'color',
          defaultValue: '#ef4444',
        },
        {
          key: 'color.backgroundColor',
          label: 'Background Color',
          type: 'color',
          defaultValue: 'transparent',
        },
      ],
    },
    {
      id: 'layout',
      title: 'Layout Settings',
      icon: 'LayoutGrid',
      defaultExpanded: true,
      fields: [
        {
          key: 'layout.orientation',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
            { label: 'Grid', value: 'grid' },
          ],
          defaultValue: 'horizontal',
        },
        {
          key: 'layout.showDividers',
          label: 'Show Dividers',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'layout.gap',
          label: 'Gap',
          type: 'range',
          min: 0,
          max: 48,
          step: 4,
          defaultValue: 0,
        },
        {
          key: 'layout.padding',
          label: 'Tile Padding',
          type: 'range',
          min: 8,
          max: 48,
          step: 2,
          defaultValue: 24,
        },
      ],
    },
  ],
  defaultConfig: {
    kpi: { showValue: true, showLabel: true, valueFormat: 'standard', icon1: '', icon2: '', icon3: '', icon4: '', valueFontSize: 36, labelFontSize: 13, trendThreshold: 0 },
    secondary: { enabled: false, position: 'bottom', valueFormat: 'percentage', fontSize: 16, trendIconType: 'triangle' },
    color: { primaryValueColor: '#475569', positiveColor: '#22c55e', negativeColor: '#ef4444', backgroundColor: 'transparent' },
    layout: { orientation: 'horizontal', showDividers: true, gap: 0, padding: 24 },
  },
});

export function buildMultiKPITileChartOptions(
  _props: MultiKPITileChartProps
): EChartsOption {
  return { series: [] };
}

const formatValue = (val: any, formatType: string) => {
  let num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return String(val); // fallback if not parseable
  
  switch (formatType) {
    case 'compact': return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
    case 'indian': return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
    case 'percentage': return num.toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%';
    case 'currency': return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    case 'standard':
    default: return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
};

export const MultiKPITileChart: React.FC<MultiKPITileChartProps> = ({
  series,
  dimensions,
  visualConfig = {},
  themeMeta,
  onDrillContextMenu,
}) => {
  const cfg = visualConfig;
  
  const orientation = getConfigValue(cfg, 'layout.orientation') ?? 'horizontal';
  const showDividers = getConfigValue(cfg, 'layout.showDividers') ?? true;
  const gap = getConfigValue(cfg, 'layout.gap') ?? 0;
  const padding = getConfigValue(cfg, 'layout.padding') ?? 24;
  
  const secondaryEnabled = getConfigValue(cfg, 'secondary.enabled') ?? false;
  const secondaryPosition = getConfigValue(cfg, 'secondary.position') ?? 'bottom';
  const secondaryFontSize = getConfigValue(cfg, 'secondary.fontSize') ?? 16;
  const secondaryFormat = getConfigValue(cfg, 'secondary.valueFormat') ?? 'percentage';
  const trendIconType = getConfigValue(cfg, 'secondary.trendIconType') ?? 'triangle';
  
  const primaryFormat = getConfigValue(cfg, 'kpi.valueFormat') ?? 'standard';
  
  const primaryValueColor = getConfigValue(cfg, 'color.primaryValueColor') ?? '#475569';
  const positiveColor = getConfigValue(cfg, 'color.positiveColor') ?? '#22c55e';
  const negativeColor = getConfigValue(cfg, 'color.negativeColor') ?? '#ef4444';
  const trendThreshold = getConfigValue(cfg, 'kpi.trendThreshold') ?? 0;
  
  const getMetricData = (s: any, dimIndex: number, formatType: string) => {
    let value: number | string = 0;
    let label = s?.name || `Metric`;

    if (s?.value !== undefined) {
      value = s.value;
    } else if (s?.data?.[0] !== undefined) {
      value = s.data[0];
    } else if (dimensions?.[dimIndex]?.data?.[0] !== undefined) {
      value = dimensions[dimIndex].data[0];
      label = dimensions[dimIndex].name || label;
    }
    
    let numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(numericValue)) numericValue = 0;
    
    const isPositive = numericValue >= trendThreshold;
    const color = isPositive ? positiveColor : negativeColor;
    const formattedValue = formatValue(value, formatType);
      
    return { label, value, numericValue, formattedValue, isPositive, color };
  };

  const tiles: Array<{
    primary: ReturnType<typeof getMetricData>,
    secondary?: ReturnType<typeof getMetricData>,
    icon?: React.FC<any>
  }> = [];

  const getIconForIndex = (idx: number) => {
    const iconName = getConfigValue(cfg, `kpi.icon${idx + 1}`);
    if (iconName && ICON_MAP[iconName]) {
      return ICON_MAP[iconName];
    }
    return undefined;
  };

  if (secondaryEnabled) {
    let tileIdx = 0;
    for (let i = 0; i < series.length; i += 2) {
      const primary = getMetricData(series[i], i, primaryFormat);
      const secondary = i + 1 < series.length ? getMetricData(series[i + 1], i + 1, secondaryFormat) : undefined;
      tiles.push({ primary, secondary, icon: getIconForIndex(tileIdx++) });
    }
  } else {
    for (let i = 0; i < series.length; i++) {
      tiles.push({ primary: getMetricData(series[i], i, primaryFormat), icon: getIconForIndex(i) });
    }
  }

  let containerClassName = "w-full h-full overflow-auto custom-scrollbar flex ";
  if (orientation === 'horizontal') {
    containerClassName += "flex-row flex-nowrap items-center justify-start";
  } else if (orientation === 'vertical') {
    containerClassName += "flex-col items-center justify-start";
  } else {
    containerClassName = "w-full h-full overflow-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 content-center justify-items-center";
  }

  const renderTrendIcon = (isPositive: boolean) => {
    if (trendIconType === 'none') return null;
    if (trendIconType === 'arrow') return <span>{isPositive ? '↑' : '↓'}</span>;
    if (trendIconType === 'plus_minus') return <span>{isPositive ? '+' : ''}</span>;
    if (trendIconType === 'lucide_trending') {
      const Icon = isPositive ? TrendingUp : TrendingDown;
      return <Icon size={secondaryFontSize} className="inline mr-1" />;
    }
    return <span>{isPositive ? '▴' : '▾'}</span>;
  };

  return (
    <div className={containerClassName} style={{ gap: `${gap}px`, backgroundColor: themeMeta?.background || (getConfigValue(cfg, 'color.backgroundColor') ?? 'transparent') }}>
      {tiles.map((tile, idx) => {
        const isLast = idx === tiles.length - 1;
        let borderStyle: React.CSSProperties = {};
        if (showDividers && !isLast) {
          if (orientation === 'horizontal') {
            borderStyle = { borderRight: `1px solid ${themeMeta?.border || '#e2e8f0'}` };
          } else if (orientation === 'vertical') {
            borderStyle = { borderBottom: `1px solid ${themeMeta?.border || '#e2e8f0'}` };
          }
        }

        let tileFlexDirection = 'flex-col';
        let alignItems = 'items-center';
        let justifyContent = 'justify-center';
        
        if (tile.secondary) {
          if (secondaryPosition === 'right') {
            tileFlexDirection = 'flex-row';
            alignItems = 'items-center';
          } else if (secondaryPosition === 'left') {
            tileFlexDirection = 'flex-row-reverse';
            alignItems = 'items-center';
          } else if (secondaryPosition === 'top') {
            tileFlexDirection = 'flex-col-reverse';
          }
        }

        const TileIcon = tile.icon;

        return (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center text-center overflow-hidden transition-colors duration-300`}
            style={{
              cursor: onDrillContextMenu ? 'context-menu' : undefined,
              padding: `${padding}px`,
              flex: orientation === 'horizontal' ? '1 1 0' : undefined,
              width: orientation === 'vertical' || orientation === 'grid' ? '100%' : undefined,
              ...borderStyle
            }}
            onContextMenu={onDrillContextMenu ? (e) => onDrillContextMenu(e, tile.primary.formattedValue, tile.primary.label) : undefined}
          >
            <div className={`w-full flex ${tileFlexDirection} ${alignItems} ${justifyContent} gap-2`}>
              
              <div className="flex flex-col items-center justify-center min-w-0">
                {(getConfigValue(cfg, 'kpi.showLabel') ?? true) && (
                  <div 
                    className="flex items-center justify-center gap-1.5 w-full mb-1"
                    style={{ color: themeMeta?.secondary || '#64748b' }}
                  >
                    {TileIcon && <TileIcon size={getConfigValue(cfg, 'kpi.labelFontSize') ?? 13} />}
                    <span
                      className="font-semibold line-clamp-1 whitespace-nowrap"
                      style={{
                        fontSize: `${getConfigValue(cfg, 'kpi.labelFontSize') ?? 13}px`,
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {tile.primary.label}
                    </span>
                  </div>
                )}
                {(getConfigValue(cfg, 'kpi.showValue') ?? true) && (
                  <span
                    className="tracking-tighter w-full px-2 break-all font-black"
                    style={{
                      fontSize: `${getConfigValue(cfg, 'kpi.valueFontSize') ?? 36}px`,
                      fontFamily: 'Inter, sans-serif',
                      color: themeMeta?.primary || primaryValueColor,
                      lineHeight: '1.1',
                    }}
                  >
                    {tile.primary.formattedValue}
                  </span>
                )}
              </div>

              {tile.secondary && (
                <div className="flex flex-col items-center justify-center min-w-0 mt-1">
                  <div 
                    className="flex items-center gap-0.5 font-bold"
                    style={{ 
                      fontSize: `${secondaryFontSize}px`,
                      color: tile.secondary.color
                    }}
                  >
                    {renderTrendIcon(tile.secondary.isPositive)}
                    <span>{tile.secondary.formattedValue}</span>
                  </div>
                  <span 
                    className="text-slate-400 text-xs mt-0.5 line-clamp-1"
                    style={{ fontSize: `${secondaryFontSize * 0.75}px` }}
                  >
                    {tile.secondary.label}
                  </span>
                </div>
              )}
              
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MultiKPITileChart;
