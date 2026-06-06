import React, { useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { ChevronUp, ChevronDown, ArrowUpDown, ChevronRight, ChevronDown as ChevronDownIcon } from 'lucide-react';

type EChartsOption = echarts.EChartsOption;

export interface PivotTableChartProps {
  categories?: string[];
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
  }>;
  visualConfig?: {
    pivot?: {
      showGrandTotal?: boolean;
      showSubTotals?: boolean;
      collapsibleGroups?: boolean;
      defaultCollapsed?: boolean;
      highlightCells?: boolean;
      colorScale?: boolean;
    };
    dataLabels?: {
      fontSize?: number;
      fontFamily?: string;
      headerBackgroundColor?: string;
      headerColor?: string;
      rowColor?: string;
      borderColor?: string;
      totalFontWeight?: 'normal' | 'bold' | 'bolder';
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
  /** Called when user right-clicks a dimension cell */
  onDrillContextMenu?: (e: React.MouseEvent, cellValue: string, colName: string) => void;
}

export const pivotTableChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'pivotTable',
  sections: [
    {
      id: 'pivot',
      title: 'Pivot Settings',
      icon: 'Table',
      defaultExpanded: true,
      fields: [
        {
          key: 'pivot.showGrandTotal',
          label: 'Show Grand Total',
          type: 'boolean',
          defaultValue: true,
          description: 'Display grand total row and column',
        },
        {
          key: 'pivot.showSubTotals',
          label: 'Show Sub Totals',
          type: 'boolean',
          defaultValue: true,
          description: 'Display subtotals for groups',
        },
        {
          key: 'pivot.collapsibleGroups',
          label: 'Collapsible Groups',
          type: 'boolean',
          defaultValue: true,
          description: 'Allow collapsing/expanding groups',
        },
        {
          key: 'pivot.defaultCollapsed',
          label: 'Default Collapsed',
          type: 'boolean',
          defaultValue: false,
          description: 'Start with groups collapsed',
        },
        {
          key: 'pivot.highlightCells',
          label: 'Highlight Cells',
          type: 'boolean',
          defaultValue: true,
          description: 'Highlight cell values',
        },
        {
          key: 'pivot.colorScale',
          label: 'Color Scale',
          type: 'boolean',
          defaultValue: false,
          description: 'Apply heatmap color scale to values',
        },
      ],
    },
    {
      id: 'dataLabels',
      title: 'Appearance',
      icon: 'Palette',
      defaultExpanded: false,
      fields: [
        {
          key: 'dataLabels.fontSize',
          label: 'Font Size',
          type: 'number',
          defaultValue: 13,
          description: 'Cell font size',
        },
        {
          key: 'dataLabels.fontFamily',
          label: 'Font Family',
          type: 'text',
          placeholder: 'Arial, sans-serif',
          description: 'Font family for cells',
        },
        {
          key: 'dataLabels.headerBackgroundColor',
          label: 'Header Background',
          type: 'color',
          defaultValue: '#f1f5f9',
          description: 'Header background color',
        },
        {
          key: 'dataLabels.headerColor',
          label: 'Header Text Color',
          type: 'color',
          defaultValue: '#1e293b',
          description: 'Header text color',
        },
        {
          key: 'dataLabels.rowColor',
          label: 'Row Background Color',
          type: 'color',
          defaultValue: '#ffffff',
          description: 'Row background color',
        },
        {
          key: 'dataLabels.borderColor',
          label: 'Border Color',
          type: 'color',
          defaultValue: '#e2e8f0',
          description: 'Cell border color',
        },
        {
          key: 'dataLabels.totalFontWeight',
          label: 'Total Font Weight',
          type: 'select',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Bold', value: 'bold' },
            { label: 'Bolder', value: 'bolder' },
          ],
          defaultValue: 'bolder',
          description: 'Font weight for total rows',
        },
      ],
    },
  ],
  defaultConfig: {
    pivot: { showGrandTotal: true, showSubTotals: true, collapsibleGroups: true, defaultCollapsed: false, highlightCells: true, colorScale: false },
    dataLabels: { fontSize: 13, fontFamily: 'Arial, sans-serif', headerBackgroundColor: '#f1f5f9', headerColor: '#1e293b', rowColor: '#ffffff', borderColor: '#e2e8f0', totalFontWeight: 'bolder' },
  },
});

export function buildPivotTableChartOptions({
  categories,
  series,
  visualConfig = {},
}: PivotTableChartProps): EChartsOption {
  // This function is kept for compatibility but PivotTable is rendered as React component
  return { series: [] };
}

export const PivotTableChart: React.FC<PivotTableChartProps> = ({
  categories,
  dimensions,
  series,
  visualConfig = {},
  themeMeta,
  onDrillContextMenu,
}) => {
  const cfg = visualConfig;
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    getConfigValue(cfg, 'pivot.defaultCollapsed') ? new Set() : new Set()
  );

  const rowCount = dimensions?.[0]?.data?.length || categories?.length || 0;

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const fontSize = getConfigValue(cfg, 'dataLabels.fontSize') ?? 13;
  const borderColor = getConfigValue(cfg, 'dataLabels.borderColor') ?? '#e2e8f0';
  const totalFontWeight = getConfigValue(cfg, 'dataLabels.totalFontWeight') ?? 'bolder';

  const showGrandTotal = getConfigValue(cfg, 'pivot.showGrandTotal') ?? true;
  const showSubTotals = getConfigValue(cfg, 'pivot.showSubTotals') ?? true;
  const collapsibleGroups = getConfigValue(cfg, 'pivot.collapsibleGroups') ?? true;
  const colorScale = getConfigValue(cfg, 'pivot.colorScale') ?? false;
  const highlightCells = getConfigValue(cfg, 'pivot.highlightCells') ?? true;

  const cellValues = useMemo(() => {
    const values: number[] = [];
    series.forEach(s => {
      if (s.data) {
        s.data.forEach(v => {
          if (typeof v === 'number') values.push(v);
        });
      }
    });
    return values;
  }, [series]);

  const minVal = Math.min(...cellValues, 0);
  const maxVal = Math.max(...cellValues, 1);

  const getColorForValue = (val: number) => {
    if (!colorScale || val === null || val === undefined) return undefined;
    const ratio = (val - minVal) / (maxVal - minVal);
    const hue = 240 - ratio * 60;
    return `hsla(${hue}, 70%, ${50 + ratio * 20}%, 0.3)`;
  };

  return (
    <div
      className="w-full h-full overflow-auto custom-scrollbar border rounded-lg shadow-sm"
      style={{
        backgroundColor: themeMeta?.background || '#ffffff',
        borderColor: themeMeta?.border || '#e2e8f0',
      }}
    >
      <table className="w-full text-left border-collapse min-w-full" style={{ fontSize: `${fontSize}px` }}>
        <thead
          className="sticky top-0 z-10 backdrop-blur-sm border-b-2"
          style={{
            backgroundColor: `${themeMeta?.background || '#ffffff'}ee`,
            borderBottomColor: themeMeta?.primary || '#6366F1',
          }}
        >
          <tr>
            {dimensions && dimensions.length > 0 ? (
              dimensions.map((d, i) => (
                <th
                  key={`dim-${i}`}
                  className="px-3 py-2 font-extrabold uppercase tracking-wider border-r"
                  style={{
                    color: themeMeta?.text || '#1e293b',
                    borderColor: themeMeta?.border || '#e2e8f0',
                  }}
                >
                  {d.name}
                </th>
              ))
            ) : (
              <th
                className="px-3 py-2 font-extrabold uppercase tracking-wider border-r"
                style={{
                  color: themeMeta?.text || '#1e293b',
                  borderColor: themeMeta?.border || '#e2e8f0',
                }}
              >
                {categories ? 'Dimension' : 'Index'}
              </th>
            )}
            {series.map((s, i) => (
              <th
                key={`ser-${i}`}
                className="px-3 py-2 font-bold border-r last:border-r-0 text-right"
                style={{
                  color: themeMeta?.secondary || '#8B5CF6',
                  borderColor: themeMeta?.border || '#e2e8f0',
                }}
              >
                <span className="truncate max-w-[150px]" title={s.name}>
                  {s.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{
            borderColor: themeMeta?.border || '#e2e8f0',
            backgroundColor: themeMeta?.background || '#ffffff',
          }}
        >
          {series.map((s, seriesIdx) => {
            const total = s.data?.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0) || 0;
            const isTotalRow = seriesIdx === series.length - 1 && showGrandTotal;

            return (
              <React.Fragment key={`ser-${seriesIdx}`}>
                <tr
                  className={`hover:bg-black/[0.03] transition-colors ${isTotalRow ? 'bg-black/[0.02]' : ''}`}
                >
                  {dimensions && dimensions.length > 0 ? (
                    dimensions.map((d, colIdx) => (
                      <td
                        key={`dim-val-${colIdx}`}
                        className={`px-3 py-1.5 font-bold whitespace-nowrap border-r ${isTotalRow ? '' : 'cursor-context-menu'}`}
                        style={{
                          color: themeMeta?.text || '#1e293b',
                          borderColor: themeMeta?.border || '#e2e8f0',
                          fontWeight: isTotalRow ? totalFontWeight as any : 'bold',
                        }}
                        onContextMenu={!isTotalRow ? (e) => onDrillContextMenu?.(e, String(d.data?.[seriesIdx] ?? ''), d.name) : undefined}
                      >
                        {isTotalRow ? 'Grand Total' : String(d.data?.[seriesIdx] ?? '-')}
                      </td>
                    ))
                  ) : (
                    <td
                      className={`px-3 py-1.5 font-bold whitespace-nowrap border-r ${isTotalRow ? '' : ''}`}
                      style={{
                        color: themeMeta?.text || '#1e293b',
                        borderColor: themeMeta?.border || '#e2e8f0',
                        fontWeight: isTotalRow ? totalFontWeight as any : 'bold',
                      }}
                    >
                      {isTotalRow ? 'Grand Total' : (categories?.[seriesIdx] ?? '-')}
                    </td>
                  )}
                  {s.data?.map((val, valIdx) => {
                    const isNull = val === null || val === undefined;
                    return (
                      <td
                        key={`ser-val-${valIdx}`}
                        className={`px-3 py-1.5 tabular-nums text-right border-r last:border-r-0 transition-colors ${
                          highlightCells ? 'hover:bg-black/[0.02]' : ''
                        }`}
                        style={{
                          color: themeMeta?.text || '#1e293b',
                          borderColor: themeMeta?.border || '#e2e8f0',
                          backgroundColor: isNull ? undefined : getColorForValue(val),
                          fontWeight: isTotalRow ? totalFontWeight as any : 'normal',
                        }}
                      >
                        {isNull ? (
                          <span className="text-slate-300">-</span>
                        ) : typeof val === 'number' ? (
                          val.toLocaleString()
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            );
          })}
          {showGrandTotal && (
            <tr
              className="bg-black/[0.04] border-t-2"
              style={{ borderTopColor: themeMeta?.primary || '#6366F1' }}
            >
              {dimensions && dimensions.length > 0 ? (
                dimensions.map((_, i) => (
                  <td
                    key={`total-dim-${i}`}
                    className="px-3 py-2 font-bolder uppercase tracking-wide border-r text-right"
                    style={{
                      color: themeMeta?.text || '#1e293b',
                      borderColor: themeMeta?.border || '#e2e8f0',
                      backgroundColor: `${themeMeta?.background || '#ffffff'}dd`,
                    }}
                  >
                    Grand Total
                  </td>
                ))
              ) : (
                <td
                  className="px-3 py-2 font-bolder uppercase tracking-wide border-r text-right"
                  style={{
                    color: themeMeta?.text || '#1e293b',
                    borderColor: themeMeta?.border || '#e2e8f0',
                    backgroundColor: `${themeMeta?.background || '#ffffff'}dd`,
                  }}
                >
                  Grand Total
                </td>
              )}
              {series.map((s, i) => {
                const total = s.data?.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0) || 0;
                return (
                  <td
                    key={`total-val-${i}`}
                    className="px-3 py-2 font-bolder tabular-nums text-right border-r last:border-r-0"
                    style={{
                      color: themeMeta?.primary || '#6366F1',
                      borderColor: themeMeta?.border || '#e2e8f0',
                      backgroundColor: `${themeMeta?.background || '#ffffff'}dd`,
                    }}
                  >
                    {total.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PivotTableChart;
