import React, { useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { ChevronDown, ArrowUpDown, ChevronRight } from 'lucide-react';

type EChartsOption = echarts.EChartsOption;

export interface PivotTableChartProps {
  categories?: string[];
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
  }>;
  pivotData?: any; // Rich structured data for pivot table
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

export function buildPivotTableChartOptions(_props: PivotTableChartProps): EChartsOption {
  // This function is kept for compatibility but PivotTable is rendered as React component
  return { series: [] };
}

export const PivotTableChart: React.FC<PivotTableChartProps> = ({
  categories,
  dimensions,
  series,
  pivotData,
  visualConfig = {},
  themeMeta,
  onDrillContextMenu,
}) => {
  const cfg = visualConfig;
  const showGrandTotal = getConfigValue(cfg, 'pivot.showGrandTotal') ?? true;
  const showSubTotals = getConfigValue(cfg, 'pivot.showSubTotals') ?? true;
  const collapsibleGroups = getConfigValue(cfg, 'pivot.collapsibleGroups') ?? true;
  const colorScale = getConfigValue(cfg, 'pivot.colorScale') ?? false;
  const highlightCells = getConfigValue(cfg, 'pivot.highlightCells') ?? true;
  const fontSize = getConfigValue(cfg, 'dataLabels.fontSize') ?? 13;
  const borderColor = getConfigValue(cfg, 'dataLabels.borderColor') ?? '#e2e8f0';
  const totalFontWeight = getConfigValue(cfg, 'dataLabels.totalFontWeight') ?? 'bolder';

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    if (!collapsibleGroups) return;
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

  const { rowTree, leafColumns, rowDimNames, colDimNames, measureNames } = useMemo(() => {
    if (pivotData) {
      // Build row tree from pivotData
      const tree = { children: new Map() };
      
      pivotData.uniqueRowKeys.forEach((rKey: string) => {
        const path = rKey.split('|||');
        let current: any = tree;
        path.forEach((val, level) => {
          if (!current.children.has(val)) {
            current.children.set(val, {
              key: path.slice(0, level + 1).join('|||'),
              value: val,
              level,
              children: new Map(),
              aggregations: {}
            });
          }
          current = current.children.get(val);
        });
      });

      const aggregateNode = (node: any) => {
        if (node.children.size === 0) {
          pivotData.leafColumns.forEach((lc: any) => {
            const colKey = lc.colValues.join('|||');
            const val = pivotData.lookup[node.key]?.[colKey]?.[lc.metricName] ?? null;
            node.aggregations[lc.key] = val;
          });
        } else {
          node.children.forEach((child: any) => aggregateNode(child));
          pivotData.leafColumns.forEach((lc: any) => {
            const childValues = Array.from(node.children.values())
              .map((child: any) => child.aggregations[lc.key])
              .filter(v => v !== null && v !== undefined);
            
            if (childValues.length === 0) {
              node.aggregations[lc.key] = null;
            } else {
              const metricObj = pivotData.rawMetrics?.find((m: any) => 
                (typeof m === 'string' && m === lc.metricName) || 
                (typeof m === 'object' && (m.alias === lc.metricName || m.name === lc.metricName))
              );
              const aggType = (metricObj?.agg || 'sum').toLowerCase();
              
              if (aggType === 'avg') {
                const sum = childValues.reduce((s: number, v: any) => s + Number(v), 0);
                node.aggregations[lc.key] = sum / childValues.length;
              } else if (aggType === 'min') {
                node.aggregations[lc.key] = Math.min(...childValues.map(v => Number(v)));
              } else if (aggType === 'max') {
                node.aggregations[lc.key] = Math.max(...childValues.map(v => Number(v)));
              } else {
                node.aggregations[lc.key] = childValues.reduce((s: number, v: any) => s + Number(v), 0);
              }
            }
          });
        }
      };

      tree.children.forEach(child => aggregateNode(child));

      return {
        rowTree: tree,
        leafColumns: pivotData.leafColumns,
        rowDimNames: pivotData.rowDimensionNames,
        colDimNames: pivotData.colDimensionNames,
        measureNames: pivotData.measureNames
      };
    }

    // Fallback block
    const fallbackRowDimNames = dimensions?.map(d => d.name) || (categories ? ['Dimension'] : ['Index']);
    const fallbackMeasureNames = series.map(s => s.name);
    const fallbackLeafColumns = series.map(s => ({ key: s.name, colValues: [], metricName: s.name }));
    
    const tree = { children: new Map() };
    const fallbackLookup: any = {};
    const rowCount = dimensions?.[0]?.data?.length || categories?.length || 0;

    for (let rIdx = 0; rIdx < rowCount; rIdx++) {
      const rowPath = dimensions && dimensions.length > 0 
        ? dimensions.map(d => String(d.data?.[rIdx] ?? ''))
        : [categories?.[rIdx] ?? `Row ${rIdx + 1}`];
      
      const rKey = rowPath.join('|||');
      let current: any = tree;
      rowPath.forEach((val, level) => {
        if (!current.children.has(val)) {
          current.children.set(val, {
            key: rowPath.slice(0, level + 1).join('|||'),
            value: val,
            level,
            children: new Map(),
            aggregations: {}
          });
        }
        current = current.children.get(val);
      });

      if (!fallbackLookup[rKey]) fallbackLookup[rKey] = { "": {} };
      series.forEach(s => {
        fallbackLookup[rKey][""][s.name] = s.data?.[rIdx] ?? null;
      });
    }

    const aggregateNodeFallback = (node: any) => {
      if (node.children.size === 0) {
        fallbackLeafColumns.forEach(lc => {
          node.aggregations[lc.key] = fallbackLookup[node.key]?.[""]?.[lc.metricName] ?? null;
        });
      } else {
        node.children.forEach((child: any) => aggregateNodeFallback(child));
        fallbackLeafColumns.forEach(lc => {
          const childValues = Array.from(node.children.values())
            .map((child: any) => child.aggregations[lc.key])
            .filter(v => v !== null && v !== undefined);
          node.aggregations[lc.key] = childValues.length === 0 ? null : childValues.reduce((s: number, v: any) => s + Number(v), 0);
        });
      }
    };
    tree.children.forEach(child => aggregateNodeFallback(child));

    return {
      rowTree: tree,
      leafColumns: fallbackLeafColumns,
      rowDimNames: fallbackRowDimNames,
      colDimNames: [],
      measureNames: fallbackMeasureNames
    };
  }, [pivotData, dimensions, categories, series]);

  const flatRows = useMemo(() => {
    if (!rowTree) return [];

    const generateRows = (node: any, path: string[] = []): any[] => {
      const rows: any[] = [];
      const sortedChildren = Array.from(node.children.values()).sort((a: any, b: any) => 
        String(a.value).localeCompare(String(b.value), undefined, { numeric: true, sensitivity: 'base' })
      );

      sortedChildren.forEach((child: any) => {
        const childPath = [...path, child.value];
        const key = child.key;
        const isLeaf = child.children.size === 0;

        if (isLeaf) {
          rows.push({
            type: 'leaf',
            key,
            path: childPath,
            values: child.aggregations,
            node: child
          });
        } else {
          const isCollapsed = collapsedGroups.has(key);
          if (isCollapsed) {
            rows.push({
              type: 'collapsed-group',
              key,
              path: childPath,
              values: child.aggregations,
              node: child
            });
          } else {
            const childRows = generateRows(child, childPath);
            rows.push(...childRows);
            
            if (showSubTotals) {
              rows.push({
                type: 'subtotal',
                key: key + '|||subtotal',
                path: childPath,
                values: child.aggregations,
                node: child
              });
            }
          }
        }
      });
      return rows;
    };

    return generateRows(rowTree);
  }, [rowTree, collapsedGroups, showSubTotals]);

  const displayLeafColumns = useMemo(() => {
    const cols = [...leafColumns];
    if (showGrandTotal && colDimNames.length > 0) {
      measureNames.forEach(m => {
        cols.push({
          key: `row-total|||${m}`,
          colValues: ['Row totals'],
          metricName: m
        });
      });
    }
    return cols;
  }, [leafColumns, showGrandTotal, colDimNames, measureNames]);

  const getCellValue = (row: any, leafCol: any) => {
    if (leafCol.key.startsWith('row-total|||')) {
      const values = leafColumns
        .filter(lc => lc.metricName === leafCol.metricName)
        .map(lc => row.values[lc.key])
        .filter(v => v !== null && v !== undefined);
      if (values.length === 0) return null;
      return values.reduce((s, v) => s + Number(v), 0);
    }
    return row.values[leafCol.key] ?? null;
  };

  const columnGrandTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    displayLeafColumns.forEach(lc => {
      const leafRowValues = flatRows
        .filter(r => r.type === 'leaf')
        .map(r => getCellValue(r, lc))
        .filter(v => v !== null && v !== undefined);
      totals[lc.key] = leafRowValues.length === 0 ? null : leafRowValues.reduce((s, v) => s + Number(v), 0);
    });
    return totals;
  }, [flatRows, displayLeafColumns]);

  const cellValuesForColorScale = useMemo(() => {
    const values: number[] = [];
    flatRows.forEach(r => {
      if (r.type === 'leaf') {
        displayLeafColumns.forEach(lc => {
          if (!lc.key.startsWith('row-total|||')) {
            const v = getCellValue(r, lc);
            if (typeof v === 'number') values.push(v);
          }
        });
      }
    });
    return values;
  }, [flatRows, displayLeafColumns]);

  const minVal = Math.min(...cellValuesForColorScale, 0);
  const maxVal = Math.max(...cellValuesForColorScale, 1);

  const getColorForValue = (val: number) => {
    if (!colorScale || val === null || val === undefined) return undefined;
    const ratio = (val - minVal) / (maxVal - minVal);
    const hue = 220; // Slate blue
    return `hsla(${hue}, 85%, 90%, ${0.1 + ratio * 0.8})`;
  };

  const getRowHeaderCell = (rowIndex: number, colIdx: number) => {
    const r = flatRows[rowIndex];
    const L = rowDimNames.length;

    if (r.type === 'subtotal') {
      if (colIdx === 0) {
        return {
          render: true,
          colSpan: L,
          rowSpan: 1,
          label: `Totals for ${r.path.join(' - ')}`,
          isSubtotal: true
        };
      } else {
        return { render: false };
      }
    }

    if (r.type === 'collapsed-group') {
      const level = r.path.length - 1;
      if (colIdx < level) {
        const isFirst = rowIndex === 0 || flatRows[rowIndex - 1].path[colIdx] !== r.path[colIdx];
        if (isFirst) {
          let rowSpan = 1;
          for (let i = rowIndex + 1; i < flatRows.length; i++) {
            if (flatRows[i].path[colIdx] === r.path[colIdx]) {
              rowSpan++;
            } else {
              break;
            }
          }
          return {
            render: true,
            colSpan: 1,
            rowSpan,
            label: r.path[colIdx],
            isGroupHeader: true,
            collapsed: true,
            groupKey: r.path.slice(0, colIdx + 1).join('|||')
          };
        } else {
          return { render: false };
        }
      } else if (colIdx === level) {
        return {
          render: true,
          colSpan: L - level,
          rowSpan: 1,
          label: r.path[colIdx],
          isGroupHeader: true,
          collapsed: true,
          groupKey: r.path.slice(0, colIdx + 1).join('|||')
        };
      } else {
        return { render: false };
      }
    }

    // Leaf row
    const isFirst = rowIndex === 0 || flatRows[rowIndex - 1].path[colIdx] !== r.path[colIdx];
    if (isFirst) {
      let rowSpan = 1;
      for (let i = rowIndex + 1; i < flatRows.length; i++) {
        if (flatRows[i].path[colIdx] === r.path[colIdx]) {
          rowSpan++;
        } else {
          break;
        }
      }
      const isGroupHeader = colIdx < L - 1;
      return {
        render: true,
        colSpan: 1,
        rowSpan,
        label: r.path[colIdx],
        isGroupHeader,
        collapsed: false,
        groupKey: r.path.slice(0, colIdx + 1).join('|||')
      };
    } else {
      return { render: false };
    }
  };

  const colHeaderRowsCount = colDimNames.length + 1; // Col dims + Metric row

  const getColHeaderCell = (rowIdx: number, leafColIdx: number) => {
    const L = colDimNames.length;
    const leafCol = displayLeafColumns[leafColIdx];
    
    if (rowIdx === L) {
      return {
        render: true,
        colSpan: 1,
        label: leafCol.metricName
      };
    }

    const prefix = leafCol.colValues.slice(0, rowIdx + 1);
    const prefixKey = prefix.join('|||');

    const isFirst = leafColIdx === 0 || 
      displayLeafColumns[leafColIdx - 1].colValues.slice(0, rowIdx + 1).join('|||') !== prefixKey;

    if (isFirst) {
      let colSpan = 1;
      for (let i = leafColIdx + 1; i < displayLeafColumns.length; i++) {
        if (displayLeafColumns[i].colValues.slice(0, rowIdx + 1).join('|||') === prefixKey) {
          colSpan++;
        } else {
          break;
        }
      }
      return {
        render: true,
        colSpan,
        label: leafCol.colValues[rowIdx] || ''
      };
    }

    return { render: false };
  };

  return (
    <div
      className="w-full h-full overflow-auto custom-scrollbar border rounded-lg shadow-sm"
      style={{
        backgroundColor: themeMeta?.background || '#ffffff',
        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
      }}
    >
      <table className="w-full text-left border-collapse min-w-full" style={{ fontSize: `${fontSize}px` }}>
        <thead
          className="sticky top-0 z-20 backdrop-blur-md"
          style={{
            backgroundColor: `${themeMeta?.background || '#ffffff'}f9`,
          }}
        >
          {Array.from({ length: colHeaderRowsCount }).map((_, rowIdx) => {
            const isLastHeaderRow = rowIdx === colHeaderRowsCount - 1;
            const isFirstHeaderRow = rowIdx === 0;
            return (
              <tr 
                key={`col-head-row-${rowIdx}`}
                className="border-b"
                style={{ borderColor: themeMeta?.border || borderColor || '#e2e8f0' }}
              >
                {/* Top-left corner row headers */}
                {isFirstHeaderRow && rowDimNames.map((_, dIdx) => (
                  <th
                    key={`corner-empty-${dIdx}`}
                    rowSpan={colDimNames.length}
                    className="px-3 py-2 border-r bg-slate-50/50 dark:bg-slate-800/20"
                    style={{ borderColor: themeMeta?.border || borderColor || '#e2e8f0' }}
                  />
                ))}
                
                {isLastHeaderRow && rowDimNames.map((name, dIdx) => (
                  <th
                    key={`corner-label-${dIdx}`}
                    className="px-3 py-2 border-r font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/30"
                    style={{
                      color: themeMeta?.text || '#1e293b',
                      borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                    }}
                  >
                    <div className="flex items-center gap-1.5 justify-between">
                      <span>{name}</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                ))}

                {/* Column dimension headers */}
                {displayLeafColumns.map((lc, leafColIdx) => {
                  const cell = getColHeaderCell(rowIdx, leafColIdx);
                  if (!cell.render) return null;
                  
                  const isRowTotalCol = lc.colValues[0] === 'Row totals';
                  return (
                    <th
                      key={`col-cell-${rowIdx}-${leafColIdx}`}
                      colSpan={cell.colSpan}
                      className={`px-3 py-2 border-r text-center font-bold whitespace-nowrap ${
                        isLastHeaderRow ? 'text-[11px] uppercase tracking-wider' : 'text-xs'
                      } ${isRowTotalCol ? 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-extrabold' : ''}`}
                      style={{
                        color: isRowTotalCol ? (themeMeta?.primary || '#4f46e5') : (themeMeta?.text || '#1e293b'),
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                        backgroundColor: isRowTotalCol ? undefined : (isLastHeaderRow ? undefined : '#f8fafc22'),
                      }}
                    >
                      {cell.label}
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody
          className="divide-y"
          style={{
            borderColor: themeMeta?.border || borderColor || '#e2e8f0',
            backgroundColor: themeMeta?.background || '#ffffff',
          }}
        >
          {flatRows.map((r, rowIndex) => {
            const isSubtotalRow = r.type === 'subtotal';
            const isCollapsedRow = r.type === 'collapsed-group';
            
            return (
              <tr
                key={`row-${r.key}`}
                className={`transition-colors hover:bg-slate-500/[0.02] ${
                  isSubtotalRow ? 'bg-slate-50/80 dark:bg-slate-800/10 font-bold' : ''
                } ${isCollapsedRow ? 'bg-slate-100/30 dark:bg-slate-800/5 font-medium' : ''}`}
              >
                {/* Row Header Dimensions */}
                {rowDimNames.map((_, colIdx) => {
                  const cell = getRowHeaderCell(rowIndex, colIdx);
                  if (!cell.render) return null;
                  
                  return (
                    <td
                      key={`row-header-val-${rowIndex}-${colIdx}`}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className={`px-3 py-2 border-r align-middle whitespace-nowrap ${
                        cell.isSubtotal ? 'font-bold text-slate-700 dark:text-slate-300 italic pl-6' : ''
                      } ${cell.isGroupHeader ? 'font-semibold text-slate-900 dark:text-slate-100 bg-slate-50/20' : ''}`}
                      style={{
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                        color: themeMeta?.text || '#1e293b',
                      }}
                    >
                      <div className="flex items-center gap-1.5 select-none">
                        {cell.isGroupHeader && (
                          <button
                            onClick={() => toggleGroup(cell.groupKey!)}
                            className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-600"
                          >
                            {cell.collapsed ? (
                              <ChevronRight size={14} className="stroke-[2.5]" />
                            ) : (
                              <ChevronDown size={14} className="stroke-[2.5]" />
                            )}
                          </button>
                        )}
                        <span 
                          className={!cell.isSubtotal ? 'cursor-context-menu' : ''}
                          onContextMenu={
                            !cell.isSubtotal && onDrillContextMenu 
                              ? (e) => onDrillContextMenu(e, String(cell.label), rowDimNames[colIdx]) 
                              : undefined
                          }
                        >
                          {cell.label}
                        </span>
                      </div>
                    </td>
                  );
                })}

                {/* Values cells */}
                {displayLeafColumns.map((lc, leafColIdx) => {
                  const val = getCellValue(r, lc);
                  const isNull = val === null || val === undefined;
                  const isRowTotal = lc.colValues[0] === 'Row totals';
                  
                  return (
                    <td
                      key={`cell-val-${rowIndex}-${leafColIdx}`}
                      className={`px-3 py-1.5 tabular-nums text-right border-r transition-colors ${
                        highlightCells && !isRowTotal && !isSubtotalRow ? 'hover:bg-slate-200/30' : ''
                      } ${isRowTotal ? 'bg-slate-100/30 dark:bg-slate-800/10 font-bold' : ''} ${
                        isSubtotalRow ? 'font-bold' : ''
                      }`}
                      style={{
                        color: isRowTotal ? (themeMeta?.primary || '#4f46e5') : (themeMeta?.text || '#1e293b'),
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                        backgroundColor: isNull ? undefined : getColorForValue(val),
                        fontWeight: (isRowTotal || isSubtotalRow) ? totalFontWeight as any : 'normal',
                      }}
                    >
                      {isNull ? (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      ) : typeof val === 'number' ? (
                        val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Grand Totals Row */}
          {showGrandTotal && (
            <tr
              className="bg-slate-100/60 dark:bg-slate-800/30 border-t-2 font-extrabold"
              style={{ borderTopColor: themeMeta?.primary || '#6366F1' }}
            >
              <td
                colSpan={rowDimNames.length}
                className="px-3 py-2.5 font-extrabold uppercase tracking-wide border-r text-right bg-slate-50/80 dark:bg-slate-800/50"
                style={{
                  color: themeMeta?.text || '#1e293b',
                  borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                }}
              >
                Grand Total
              </td>
              {displayLeafColumns.map((lc, leafColIdx) => {
                const val = columnGrandTotals[lc.key];
                const isNull = val === null || val === undefined;
                const isRowTotal = lc.colValues[0] === 'Row totals';
                
                return (
                  <td
                    key={`grand-total-val-${leafColIdx}`}
                    className={`px-3 py-2.5 tabular-nums text-right border-r ${
                      isRowTotal ? 'bg-slate-100/80 dark:bg-slate-800/40 text-indigo-600 dark:text-indigo-400 font-black' : ''
                    }`}
                    style={{
                      color: isRowTotal ? undefined : (themeMeta?.primary || '#6366F1'),
                      borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                    }}
                  >
                    {isNull ? (
                      <span className="text-slate-300 dark:text-slate-700">-</span>
                    ) : typeof val === 'number' ? (
                      val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    ) : (
                      String(val)
                    )}
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
