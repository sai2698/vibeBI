import type { FC } from 'react';

// Base configuration field types
export type ConfigFieldType = 
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'radio'
  | 'color'
  | 'range';

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
}

export interface ConfigSection {
  id: string;
  title: string;
  icon?: string;
  fields: ConfigField[];
  defaultExpanded?: boolean;
}

export interface ChartVisualConfig {
  [key: string]: any;
}

export interface ChartConfigSchema {
  chartType: string;
  sections: ConfigSection[];
  defaultConfig: ChartVisualConfig;
}

// Component type for custom config renderers
export type ConfigRenderer = FC<{
  value: any;
  onChange: (value: any) => void;
  field: ConfigField;
}>;

// Helper to create config schema
export function createChartConfigSchema(config: ChartConfigSchema): ChartConfigSchema {
  return config;
}

const keyMap: Record<string, string> = {
  'x_axis.title': 'xAxisTitle',
  'x_axis.show': 'xAxisShow',
  'x_axis.labelRotation': 'xAxisRotation',
  'x_axis.format': 'xAxisFormat',
  'x_axis.scale': 'xAxisScale',
  'x_axis.truncate': 'xAxisTruncate',
  'x_axis.showGridLines': 'xAxisShowGridLines',
  'y_axis.title': 'yAxisTitle',
  'y_axis.show': 'yAxisShow',
  'y_axis.format': 'yAxisFormat',
  'y_axis.scale': 'yAxisScale',
  'y_axis.truncate': 'yAxisTruncate',
  'y_axis.showGridLines': 'yAxisShowGridLines',
  'legend.show': 'showLegend',
  'legend.orientation': 'legendOrientation',
  'legend.position': 'legendPosition',
  'legend.sortBy': 'legendSortBy',
  'dataLabels.show': 'showLabels',
  'dataLabels.position': 'labelPosition',
  'dataLabels.format': 'labelFormat',
  'dataLabels.showZero': 'labelShowZero',
  'bar.stacking': 'stacking',
  'bar.orientation': 'barOrientation',
  'bar.barWidth': 'barWidth',
  'line.stacking': 'stacking',
  'line.smooth': 'smooth',
  'line.showPoints': 'showPoints',
  'line.areaFill': 'areaFill',
  'line.areaOpacity': 'areaOpacity',
  'line.step': 'step',
  'line.symbol': 'symbol',
  'pie.donut': 'donut',
  'pie.innerRadius': 'innerRadius',
  'pie.outerRadius': 'outerRadius',
  'pie.padAngle': 'padAngle',
  'pie.borderRadius': 'borderRadius',
  'donut.innerRadius': 'innerRadius',
  'donut.outerRadius': 'outerRadius',
  'donut.padAngle': 'padAngle',
  'donut.borderRadius': 'borderRadius',
  'tooltip.show': 'tooltipShow',
  'tooltip.trigger': 'tooltipTrigger',
  'toolbox.show': 'toolboxShow',
  'dataZoom.show': 'dataZoomShow',
  'dataZoom.type': 'dataZoomType',
  'dataZoom.orient': 'dataZoomOrient',
  'animation.duration': 'animationDuration',
};

// Helper to get config value with nested path support and flat key fallback
export function getConfigValue(config: any, path: string): any {
  if (!config) return undefined;
  // First try the nested lookup
  const nestedVal = path.split('.').reduce((obj, key) => obj?.[key], config);
  if (nestedVal !== undefined && nestedVal !== null) {
    return nestedVal;
  }
  // Fallback to flat key lookup
  const flatKey = keyMap[path];
  if (flatKey && config[flatKey] !== undefined && config[flatKey] !== null) {
    return config[flatKey];
  }
  // Extra fallbacks for different variations
  if (path === 'line.smooth' && config.smoothCurves !== undefined) {
    return config.smoothCurves;
  }
  return nestedVal;
}

// Helper to set config value with nested path support
export function setConfigValue(config: any, path: string, value: any): any {
  const newConfig = { ...config };
  const keys = path.split('.');
  let current = newConfig;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  return newConfig;
}
