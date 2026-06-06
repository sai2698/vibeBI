import React, { useState } from 'react';
import { 
  Settings2, TrendingUp, LayoutList, Type,
  PieChart, BarChart3, LineChart,
  SortAsc, SortDesc, MoveHorizontal, MoveVertical,
  Eye, Sliders, ChevronDown, ChevronUp
} from 'lucide-react';

export interface SupersetVisualConfig {
  x_axis?: {
    title?: string;
    show?: boolean;
    labelRotation?: number;
    format?: string;
    bounds?: { min?: number; max?: number };
    truncate?: boolean;
    scale?: 'linear' | 'log';
    showGridLines?: boolean;
  };

  y_axis?: {
    title?: string;
    show?: boolean;
    format?: string;
    bounds?: { min?: number; max?: number };
    truncate?: boolean;
    scale?: 'linear' | 'log';
    showGridLines?: boolean;
  };

  legend?: {
    show?: boolean;
    orientation?: 'horizontal' | 'vertical';
    position?: 'top' | 'bottom' | 'left' | 'right' | 'inside';
    type?: 'plain' | 'scroll';
    sortBy?: 'label_asc' | 'label_desc' | 'data_asc' | 'data_desc' | null;
  };

  dataLabels?: {
    show?: boolean;
    position?: 'inside' | 'outside' | 'top' | 'bottom' | 'left' | 'right';
    format?: string;
    showZero?: boolean;
  };

  bar?: {
    orientation?: 'vertical' | 'horizontal';
    stacking?: 'normal' | 'percent' | null;
    groupBy?: string[];
    barWidth?: string | number;
  };

  line?: {
    smooth?: boolean;
    showPoints?: boolean;
    pointSize?: number;
    areaFill?: boolean;
    areaOpacity?: number;
    step?: string;
    symbol?: string;
  };

  pie?: {
    donut?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    roseType?: boolean;
    borderRadius?: number;
    padAngle?: number;
  };

  donut?: {
    innerRadius?: number;
    outerRadius?: number;
    borderRadius?: number;
    padAngle?: number;
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

  sorting?: {
    sortBy?: 'label_asc' | 'label_desc' | 'data_asc' | 'data_desc' | 'custom';
    customOrder?: string[];
  };

  tooltip?: {
    show?: boolean;
    format?: string;
    rich?: boolean;
    trigger?: 'item' | 'axis';
  };

  numberFormat?: string;
  currencyFormat?: string;
  dateFormat?: string;
  showLegend?: boolean;
  showLabels?: boolean;
  stacked?: boolean;
  smoothCurves?: boolean;
  colorPalette?: string[];
  backgroundColor?: string;
  headerFontSize?: number;
}

export const D3_FORMAT_OPTIONS = [
  { label: 'Adaptive Formatting', value: 'adaptive' },
  { label: 'Default (~g)', value: '~g' },
  { label: 'Comma (,)', value: ',' },
  { label: 'Percent (.0%)', value: '.0%' },
  { label: 'Percent (.2%)', value: '.2%' },
  { label: 'Currency ($,.0f)', value: '$,.0f' },
  { label: 'Currency ($,.2f)', value: '$,.2f' },
  { label: 'Scientific (.2e)', value: '.2e' },
  { label: 'Exponential (.2s)', value: '.2s' },
  { label: 'Integer (d)', value: 'd' },
  { label: 'Fixed (.2f)', value: '.2f' },
  { label: 'Fixed (.3f)', value: '.3f' },
  { label: 'Fixed (.4f)', value: '.4f' },
];

export const D3_TIME_FORMAT_OPTIONS = [
  { label: 'Adaptive Formatting', value: 'adaptive' },
  { label: 'Smart Date (smart_date)', value: 'smart_date' },
  { label: '%Y-%m-%d', value: '%Y-%m-%d' },
  { label: '%Y-%m-%d %H:%M', value: '%Y-%m-%d %H:%M' },
  { label: '%Y-%m-%d %H:%M:%S', value: '%Y-%m-%d %H:%M:%S' },
  { label: '%d %b %Y', value: '%d %b %Y' },
  { label: '%d %B %Y', value: '%d %B %Y' },
  { label: '%B %Y', value: '%B %Y' },
  { label: '%m/%d/%Y', value: '%m/%d/%Y' },
  { label: '%H:%M:%S', value: '%H:%M:%S' },
  { label: '%H:%M', value: '%H:%M' },
];

export const AXIS_LABEL_ROTATION_OPTIONS = [
  { label: '0°', value: 0 },
  { label: '30°', value: 30 },
  { label: '45°', value: 45 },
  { label: '60°', value: 60 },
  { label: '90°', value: 90 },
];

export const LEGEND_POSITION_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Inside', value: 'inside' },
];

export const LEGEND_ORIENTATION_OPTIONS = [
  { label: 'Horizontal', value: 'horizontal' },
  { label: 'Vertical', value: 'vertical' },
];

export const STACKING_OPTIONS = [
  { label: 'Not Stacked', value: null },
  { label: 'Stacked', value: 'normal' },
  { label: 'Stacked (100%)', value: 'percent' },
];

export const SORT_OPTIONS = [
  { label: 'Sort by data (default)', value: null },
  { label: 'Label ascending', value: 'label_asc' },
  { label: 'Label descending', value: 'label_desc' },
  { label: 'Data ascending', value: 'data_asc' },
  { label: 'Data descending', value: 'data_desc' },
];

export const DATA_LABEL_POSITION_OPTIONS = [
  { label: 'Inside', value: 'inside' },
  { label: 'Outside', value: 'outside' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

export const TOOLTIP_TRIGGER_OPTIONS = [
  { label: 'On Item Hover', value: 'item' },
  { label: 'On Axis Hover', value: 'axis' },
];

interface SupersetChartControlsProps {
  config: SupersetVisualConfig;
  onChange: (config: SupersetVisualConfig) => void;
  chartType?: string;
}

const SupersetChartControls: React.FC<SupersetChartControlsProps> = ({
  config,
  onChange,
  chartType = 'bar'
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([
    'x_axis', 'y_axis', 'legend', 'dataLabels', 'sorting', 'tooltip'
  ]));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  const updateConfig = (path: string, value: any) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  const updateNested = (section: string, field: string, value: any) => {
    const currentSection = config[section] || {};
    updateConfig(section, { ...currentSection, [field]: value });
  };

  const SectionHeader: React.FC<{ section: string; title: string; icon: React.ReactNode }> = ({ section, title, icon }) => (
    <div 
      className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a1b1e] -mx-4 px-4 py-1 transition-colors"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        {icon}
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</label>
      </div>
      {isExpanded(section) ? (
        <ChevronUp size={14} className="text-slate-400" />
      ) : (
        <ChevronDown size={14} className="text-slate-400" />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* X-Axis Configuration */}
      {chartType !== 'pie' && chartType !== 'donut' && chartType !== 'funnel' && chartType !== 'treemap' && chartType !== 'sunburst' && chartType !== 'gauge' && chartType !== 'kpi' && (
        <div className="space-y-3">
          <SectionHeader 
            section="x_axis" 
            title="X-Axis Configuration" 
            icon={<TrendingUp size={14} className="text-brand" />}
          />
          
          {isExpanded('x_axis') && (
            <div className="space-y-3 pl-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Axis Label</span>
                <input
                  type="text"
                  value={config.x_axis?.title || ''}
                  onChange={e => updateNested('x_axis', 'title', e.target.value)}
                  placeholder="X-Axis Title"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Label Rotation</span>
                <select
                  value={config.x_axis?.labelRotation || 0}
                  onChange={e => updateNested('x_axis', 'labelRotation', parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  {AXIS_LABEL_ROTATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Number Format</span>
                <select
                  value={config.x_axis?.format || 'adaptive'}
                  onChange={e => updateNested('x_axis', 'format', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  {D3_FORMAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Scale Type</span>
                <select
                  value={config.x_axis?.scale || 'linear'}
                  onChange={e => updateNested('x_axis', 'scale', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  <option value="linear" className="dark:bg-slate-900">Linear</option>
                  <option value="log" className="dark:bg-slate-900">Logarithmic</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Show Axis</span>
                <input
                  type="checkbox"
                  checked={config.x_axis?.show !== false}
                  onChange={e => updateNested('x_axis', 'show', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Show Grid Lines</span>
                <input
                  type="checkbox"
                  checked={!!config.x_axis?.showGridLines}
                  onChange={e => updateNested('x_axis', 'showGridLines', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Truncate Axis</span>
                <input
                  type="checkbox"
                  checked={!!config.x_axis?.truncate}
                  onChange={e => updateNested('x_axis', 'truncate', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Y-Axis Configuration */}
      {chartType !== 'pie' && chartType !== 'donut' && chartType !== 'funnel' && chartType !== 'treemap' && chartType !== 'sunburst' && chartType !== 'gauge' && chartType !== 'kpi' && (
        <div className="space-y-3">
          <SectionHeader 
            section="y_axis" 
            title="Y-Axis Configuration" 
            icon={<TrendingUp size={14} className="text-brand" />}
          />
          
          {isExpanded('y_axis') && (
            <div className="space-y-3 pl-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Axis Label</span>
                <input
                  type="text"
                  value={config.y_axis?.title || ''}
                  onChange={e => updateNested('y_axis', 'title', e.target.value)}
                  placeholder="Y-Axis Title"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Number Format</span>
                <select
                  value={config.y_axis?.format || 'adaptive'}
                  onChange={e => updateNested('y_axis', 'format', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  {D3_FORMAT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Scale Type</span>
                <select
                  value={config.y_axis?.scale || 'linear'}
                  onChange={e => updateNested('y_axis', 'scale', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  <option value="linear" className="dark:bg-slate-900">Linear</option>
                  <option value="log" className="dark:bg-slate-900">Logarithmic</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Show Axis</span>
                <input
                  type="checkbox"
                  checked={config.y_axis?.show !== false}
                  onChange={e => updateNested('y_axis', 'show', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Show Grid Lines</span>
                <input
                  type="checkbox"
                  checked={!!config.y_axis?.showGridLines}
                  onChange={e => updateNested('y_axis', 'showGridLines', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Truncate Axis</span>
                <input
                  type="checkbox"
                  checked={!!config.y_axis?.truncate}
                  onChange={e => updateNested('y_axis', 'truncate', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend Configuration */}
      <div className="space-y-3">
        <SectionHeader 
          section="legend" 
          title="Legend Configuration" 
          icon={<LayoutList size={14} className="text-brand" />}
        />
        
        {isExpanded('legend') && (
          <div className="space-y-3 pl-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Show Legend</span>
              <input
                type="checkbox"
                checked={config.legend?.show !== false}
                onChange={e => updateNested('legend', 'show', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
              />
            </div>

            {config.legend?.show !== false && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Orientation</span>
                  <select
                    value={config.legend?.orientation || 'horizontal'}
                    onChange={e => updateNested('legend', 'orientation', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                  >
                    {LEGEND_ORIENTATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Position</span>
                  <select
                    value={config.legend?.position || 'bottom'}
                    onChange={e => updateNested('legend', 'position', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                  >
                    {LEGEND_POSITION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Sort Legend</span>
                  <select
                    value={config.legend?.sortBy || null}
                    onChange={e => updateNested('legend', 'sortBy', e.target.value || null)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                  >
                    <option value="" className="dark:bg-slate-900">Sort by data</option>
                    <option value="label_asc" className="dark:bg-slate-900">Label ascending</option>
                    <option value="label_desc" className="dark:bg-slate-900">Label descending</option>
                    <option value="data_asc" className="dark:bg-slate-900">Data ascending</option>
                    <option value="data_desc" className="dark:bg-slate-900">Data descending</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Data Labels Configuration */}
      <div className="space-y-3">
        <SectionHeader 
          section="dataLabels" 
          title="Data Labels" 
          icon={<Type size={14} className="text-brand" />}
        />
        
        {isExpanded('dataLabels') && (
          <div className="space-y-3 pl-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Show Labels</span>
              <input
                type="checkbox"
                checked={config.dataLabels?.show !== false}
                onChange={e => updateNested('dataLabels', 'show', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
              />
            </div>

            {config.dataLabels?.show !== false && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Position</span>
                  <select
                    value={config.dataLabels?.position || 'outside'}
                    onChange={e => updateNested('dataLabels', 'position', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                  >
                    {DATA_LABEL_POSITION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Number Format</span>
                  <select
                    value={config.dataLabels?.format || 'adaptive'}
                    onChange={e => updateNested('dataLabels', 'format', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                  >
                    {D3_FORMAT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Show Zero Values</span>
                  <input
                    type="checkbox"
                    checked={config.dataLabels?.showZero !== false}
                    onChange={e => updateNested('dataLabels', 'showZero', e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bar Chart Specific */}
      {chartType === 'bar' && (
        <div className="space-y-3">
          <SectionHeader 
            section="bar" 
            title="Bar Chart Options" 
            icon={<BarChart3 size={14} className="text-brand" />}
          />
          
          {isExpanded('bar') && (
            <div className="space-y-3 pl-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Orientation</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateNested('bar', 'orientation', 'vertical')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      config.bar?.orientation !== 'horizontal'
                        ? 'bg-brand text-white'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <MoveVertical size={14} /> Vertical
                  </button>
                  <button
                    onClick={() => updateNested('bar', 'orientation', 'horizontal')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      config.bar?.orientation === 'horizontal'
                        ? 'bg-brand text-white'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <MoveHorizontal size={14} /> Horizontal
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Stacking</span>
                <select
                  value={config.bar?.stacking || null}
                  onChange={e => updateNested('bar', 'stacking', e.target.value || null)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  {STACKING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Line Chart Specific */}
      {chartType === 'line' && (
        <div className="space-y-3">
          <SectionHeader 
            section="line" 
            title="Line Chart Options" 
            icon={<LineChart size={14} className="text-brand" />}
          />
          
          {isExpanded('line') && (
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Smooth Curves</span>
                <input
                  type="checkbox"
                  checked={!!config.line?.smooth}
                  onChange={e => updateNested('line', 'smooth', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Show Points</span>
                <input
                  type="checkbox"
                  checked={config.line?.showPoints !== false}
                  onChange={e => updateNested('line', 'showPoints', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Area Fill</span>
                <input
                  type="checkbox"
                  checked={!!config.line?.areaFill}
                  onChange={e => updateNested('line', 'areaFill', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Step Line</span>
                <select
                  value={config.line?.step || ''}
                  onChange={e => updateNested('line', 'step', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  <option value="" className="dark:bg-slate-900">Disabled</option>
                  <option value="start" className="dark:bg-slate-900">Start Step</option>
                  <option value="middle" className="dark:bg-slate-900">Middle Step</option>
                  <option value="end" className="dark:bg-slate-900">End Step</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Point Marker Style</span>
                <select
                  value={config.line?.symbol || 'circle'}
                  onChange={e => updateNested('line', 'symbol', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  <option value="circle" className="dark:bg-slate-900">Circle</option>
                  <option value="rect" className="dark:bg-slate-900">Rectangle</option>
                  <option value="roundRect" className="dark:bg-slate-900">Round Rectangle</option>
                  <option value="triangle" className="dark:bg-slate-900">Triangle</option>
                  <option value="diamond" className="dark:bg-slate-900">Diamond</option>
                  <option value="pin" className="dark:bg-slate-900">Pin</option>
                  <option value="arrow" className="dark:bg-slate-900">Arrow</option>
                  <option value="none" className="dark:bg-slate-900">None</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pie/Donut Chart Specific */}
      {(chartType === 'pie' || chartType === 'donut') && (
        <div className="space-y-3">
          <SectionHeader 
            section="pie" 
            title="Pie Chart Options" 
            icon={<PieChart size={14} className="text-brand" />}
          />
          
          {isExpanded('pie') && (
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Donut Style</span>
                <input
                  type="checkbox"
                  checked={!!config.pie?.donut}
                  onChange={e => updateNested('pie', 'donut', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Outer Radius (%)</span>
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={config.pie?.outerRadius || 75}
                  onChange={e => updateNested('pie', 'outerRadius', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-[10px] font-semibold text-slate-500">{config.pie?.outerRadius || 75}%</span>
              </div>

              {config.pie?.donut && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Inner Radius (%)</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={config.pie?.innerRadius || 40}
                    onChange={e => updateNested('pie', 'innerRadius', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[10px] font-semibold text-slate-500">{config.pie?.innerRadius || 40}%</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Corner Rounding</span>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={chartType === 'donut' ? (config.donut?.borderRadius ?? 0) : (config.pie?.borderRadius ?? 0)}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (chartType === 'donut') {
                      updateNested('donut', 'borderRadius', val);
                    } else {
                      updateNested('pie', 'borderRadius', val);
                    }
                  }}
                  className="w-full"
                />
                <span className="text-[10px] font-semibold text-slate-500">
                  {chartType === 'donut' ? (config.donut?.borderRadius ?? 0) : (config.pie?.borderRadius ?? 0)}px
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Slice Gap Angle</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={chartType === 'donut' ? (config.donut?.padAngle ?? 0) : (config.pie?.padAngle ?? 0)}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (chartType === 'donut') {
                      updateNested('donut', 'padAngle', val);
                    } else {
                      updateNested('pie', 'padAngle', val);
                    }
                  }}
                  className="w-full"
                />
                <span className="text-[10px] font-semibold text-slate-500">
                  {chartType === 'donut' ? (config.donut?.padAngle ?? 0) : (config.pie?.padAngle ?? 0)}°
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sorting Configuration */}
      <div className="space-y-3">
        <SectionHeader 
          section="sorting" 
          title="Sorting" 
          icon={<Sliders size={14} className="text-brand" />}
        />
        
        {isExpanded('sorting') && (
          <div className="space-y-3 pl-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Sort By</span>
              <select
                value={config.sorting?.sortBy || null}
                onChange={e => updateNested('sorting', 'sortBy', e.target.value || null)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip Configuration */}
      <div className="space-y-3">
        <SectionHeader 
          section="tooltip" 
          title="Tooltip" 
          icon={<Eye size={14} className="text-brand" />}
        />
        
        {isExpanded('tooltip') && (
          <div className="space-y-3 pl-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Show Tooltip</span>
              <input
                type="checkbox"
                checked={config.tooltip?.show !== false}
                onChange={e => updateNested('tooltip', 'show', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
              />
            </div>

            {config.tooltip?.show !== false && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Trigger On</span>
                <select
                  value={config.tooltip?.trigger || 'item'}
                  onChange={e => updateNested('tooltip', 'trigger', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                >
                  {TOOLTIP_TRIGGER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoom & Scroll (dataZoom) */}
      {chartType !== 'pie' && chartType !== 'donut' && chartType !== 'funnel' && chartType !== 'treemap' && chartType !== 'sunburst' && chartType !== 'gauge' && chartType !== 'kpi' && (
        <div className="space-y-3">
          <SectionHeader 
            section="dataZoom" 
            title="Data Zoom & Scroll" 
            icon={<MoveHorizontal size={14} className="text-brand" />}
          />
          
          {isExpanded('dataZoom') && (
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Enable Zoom/Scroll</span>
                <input
                  type="checkbox"
                  checked={!!config.dataZoom?.show}
                  onChange={e => updateNested('dataZoom', 'show', e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
                />
              </div>

              {config.dataZoom?.show && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Zoom Control Type</span>
                    <select
                      value={config.dataZoom?.type || 'slider'}
                      onChange={e => updateNested('dataZoom', 'type', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                    >
                      <option value="slider" className="dark:bg-slate-900">Slider Scrollbar</option>
                      <option value="inside" className="dark:bg-slate-900">Inside Mouse/Touch</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Orientation</span>
                    <select
                      value={config.dataZoom?.orient || 'horizontal'}
                      onChange={e => updateNested('dataZoom', 'orient', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
                    >
                      <option value="horizontal" className="dark:bg-slate-900">Horizontal</option>
                      <option value="vertical" className="dark:bg-slate-900">Vertical</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbox Utilities */}
      <div className="space-y-3">
        <SectionHeader 
          section="toolbox" 
          title="Toolbox Utilities" 
          icon={<Settings2 size={14} className="text-brand" />}
        />
        
        {isExpanded('toolbox') && (
          <div className="space-y-3 pl-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Show Toolbox</span>
              <input
                type="checkbox"
                checked={!!config.toolbox?.show}
                onChange={e => updateNested('toolbox', 'show', e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand focus:ring-brand w-4 h-4 cursor-pointer dark:bg-[#1a1b1e]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Animation Settings */}
      <div className="space-y-3">
        <SectionHeader 
          section="animation" 
          title="Animation Settings" 
          icon={<Sliders size={14} className="text-brand" />}
        />
        
        {isExpanded('animation') && (
          <div className="space-y-3 pl-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Duration (ms)</span>
              <input
                type="range"
                min="0"
                max="5000"
                step="250"
                value={config.animation?.duration ?? 1000}
                onChange={e => updateNested('animation', 'duration', parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-[10px] font-semibold text-slate-500">{config.animation?.duration ?? 1000}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupersetChartControls;
