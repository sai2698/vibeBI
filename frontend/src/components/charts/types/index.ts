// Chart type builders - exports for all chart types

import type { ChartConfigSchema, ConfigSection, ConfigField, ChartVisualConfig } from './config-schema';
export type { ChartConfigSchema, ConfigSection, ConfigField, ChartVisualConfig };
export { createChartConfigSchema, getConfigValue, setConfigValue } from './config-schema';
export { DynamicConfigControls } from './DynamicConfigControls';

import { buildBarChartOptions, barChartConfigSchema } from './BarChart';
import { buildLineChartOptions, lineChartConfigSchema } from './LineChart';
import { buildAreaChartOptions, areaChartConfigSchema } from './AreaChart';
import { buildPieChartOptions, pieChartConfigSchema } from './PieChart';
import { buildDonutChartOptions, donutChartConfigSchema } from './DonutChart';
import { buildScatterChartOptions, scatterChartConfigSchema } from './ScatterChart';
import { buildHeatmapChartOptions, heatmapChartConfigSchema } from './HeatmapChart';
import { buildRadarChartOptions, radarChartConfigSchema } from './RadarChart';
import { buildTreemapChartOptions, treemapChartConfigSchema } from './TreemapChart';
import { buildSunburstChartOptions, sunburstChartConfigSchema } from './SunburstChart';
import { buildFunnelChartOptions, funnelChartConfigSchema } from './FunnelChart';
import { buildGaugeChartOptions, gaugeChartConfigSchema } from './GaugeChart';
import { buildKPITileChartOptions, kpiTileChartConfigSchema } from './KPITileChart';
import { buildPictorialBarChartOptions, pictorialBarChartConfigSchema } from './PictorialBarChart';
import { buildThemeRiverChartOptions, themeRiverChartConfigSchema } from './ThemeRiverChart';
import { buildCalendarChartOptions, calendarChartConfigSchema } from './CalendarChart';
import { buildChordChartOptions, chordChartConfigSchema } from './ChordChart';
import { buildDataTableChartOptions, dataTableChartConfigSchema } from './DataTableChart';
import { buildPivotTableChartOptions, pivotTableChartConfigSchema } from './PivotTableChart';

export {
  buildBarChartOptions, barChartConfigSchema,
  buildLineChartOptions, lineChartConfigSchema,
  buildAreaChartOptions, areaChartConfigSchema,
  buildPieChartOptions, pieChartConfigSchema,
  buildDonutChartOptions, donutChartConfigSchema,
  buildScatterChartOptions, scatterChartConfigSchema,
  buildHeatmapChartOptions, heatmapChartConfigSchema,
  buildRadarChartOptions, radarChartConfigSchema,
  buildTreemapChartOptions, treemapChartConfigSchema,
  buildSunburstChartOptions, sunburstChartConfigSchema,
  buildFunnelChartOptions, funnelChartConfigSchema,
  buildGaugeChartOptions, gaugeChartConfigSchema,
  buildKPITileChartOptions, kpiTileChartConfigSchema,
  buildPictorialBarChartOptions, pictorialBarChartConfigSchema,
  buildThemeRiverChartOptions, themeRiverChartConfigSchema,
  buildCalendarChartOptions, calendarChartConfigSchema,
  buildChordChartOptions, chordChartConfigSchema,
  buildDataTableChartOptions, dataTableChartConfigSchema,
  buildPivotTableChartOptions, pivotTableChartConfigSchema
};

// Helper to get chart config schema by chart type
export function getChartConfigSchema(chartType: string): ChartConfigSchema | undefined {
  const schemas: Record<string, ChartConfigSchema> = {
    bar: barChartConfigSchema,
    line: lineChartConfigSchema,
    area: areaChartConfigSchema,
    pie: pieChartConfigSchema,
    donut: donutChartConfigSchema,
    scatter: scatterChartConfigSchema,
    heatmap: heatmapChartConfigSchema,
    radar: radarChartConfigSchema,
    treemap: treemapChartConfigSchema,
    sunburst: sunburstChartConfigSchema,
    funnel: funnelChartConfigSchema,
    gauge: gaugeChartConfigSchema,
    kpi: kpiTileChartConfigSchema,
    pictorialBar: pictorialBarChartConfigSchema,
    themeRiver: themeRiverChartConfigSchema,
    calendar: calendarChartConfigSchema,
    chord: chordChartConfigSchema,
    dataTable: dataTableChartConfigSchema,
    table: dataTableChartConfigSchema,
    pivotTable: pivotTableChartConfigSchema,
    pivot: pivotTableChartConfigSchema,
  };
  return schemas[chartType];
}
