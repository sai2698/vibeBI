import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, ArrowUpDown, Layers, X, Filter, Table, Check, Maximize2, Minimize2 } from 'lucide-react';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { toSafeCategoryValue, displayCategoryValue } from '../../../utils/chartUtils';

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
      totalPosition?: 'top' | 'bottom';
      showRowGrandTotal?: boolean;
      showColumnGrandTotal?: boolean;
      showColumnSubTotals?: boolean;
      density?: 'compact' | 'comfortable' | 'spacious';
      showMiniBar?: boolean;
      stickyRowHeaders?: boolean;
      numberFormat?: 'auto' | 'number' | 'currency' | 'percent';
      decimalPlaces?: number;
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
  onDrillDown?: (fromDimension: string, toDimension: string, clickedValue: string | string[]) => void;
  onFilterByValue?: (column: string | Record<string, string[]>, value?: string | string[]) => void;
  onExcludeValue?: (column: string | Record<string, string[]>, value?: string | string[]) => void;
  availableColumns?: string[];
  currentDimensionName?: string;
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
          key: 'pivot.totalPosition',
          label: 'Totals Position',
          type: 'select',
          options: [
            { label: 'Bottom', value: 'bottom' },
            { label: 'Top', value: 'top' },
          ],
          defaultValue: 'bottom',
          description: 'Show Totals at the top or bottom of the table',
        },
        {
          key: 'pivot.showColumnSubTotals',
          label: 'Show Column Subtotals',
          type: 'boolean',
          defaultValue: true,
          description: 'Display subtotals for column dimension groups',
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
          key: 'pivot.density',
          label: 'Row Density',
          type: 'select',
          options: [
            { label: 'Compact', value: 'compact' },
            { label: 'Comfortable', value: 'comfortable' },
            { label: 'Spacious', value: 'spacious' },
          ],
          defaultValue: 'comfortable',
          description: 'Row spacing density',
        },
        {
          key: 'pivot.showMiniBar',
          label: 'Inline Mini-Bars',
          type: 'boolean',
          defaultValue: false,
          description: 'Show visual mini-bars in metric cells',
        },
        {
          key: 'pivot.stickyRowHeaders',
          label: 'Sticky Row Headers',
          type: 'boolean',
          defaultValue: true,
          description: 'Keep row dimension columns locked during horizontal scrolling',
        },
        {
          key: 'pivot.colorScale',
          label: 'Color Scale Heatmap',
          type: 'boolean',
          defaultValue: false,
          description: 'Apply heatmap color scale to values',
        },
        {
          key: 'pivot.numberFormat',
          label: 'Number Format',
          type: 'select',
          options: [
            { label: 'Auto', value: 'auto' },
            { label: 'Number', value: 'number' },
            { label: 'Currency ($)', value: 'currency' },
            { label: 'Percentage (%)', value: 'percent' },
          ],
          defaultValue: 'auto',
          description: 'Formatting format for numeric cells',
        },
        {
          key: 'pivot.decimalPlaces',
          label: 'Decimal Places',
          type: 'number',
          defaultValue: 2,
          description: 'Number of decimal places to show',
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
          defaultValue: 12,
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
          defaultValue: '#f8fafc',
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
    pivot: {
      showGrandTotal: true,
      showSubTotals: true,
      totalPosition: 'bottom',
      showColumnSubTotals: true,
      collapsibleGroups: true,
      defaultCollapsed: false,
      density: 'comfortable',
      showMiniBar: false,
      stickyRowHeaders: true,
      colorScale: false,
      numberFormat: 'auto',
      decimalPlaces: 2,
    },
    dataLabels: {
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      headerBackgroundColor: '#f8fafc',
      headerColor: '#1e293b',
      rowColor: '#ffffff',
      borderColor: '#e2e8f0',
      totalFontWeight: 'bolder',
    },
  },
});

export function buildPivotTableChartOptions(_props: PivotTableChartProps): any {
  return { series: [] };
}

export const PivotTableChart: React.FC<PivotTableChartProps> = ({
  categories,
  dimensions,
  series,
  pivotData,
  visualConfig = {},
  themeMeta,
  onDrillDown,
  onFilterByValue,
  onExcludeValue,
  availableColumns = [],
  currentDimensionName = '',
}) => {
  const cfg = visualConfig;
  const showGrandTotal = getConfigValue(cfg, 'pivot.showGrandTotal') ?? true;
  const showSubTotals = getConfigValue(cfg, 'pivot.showSubTotals') ?? true;
  const collapsibleGroups = getConfigValue(cfg, 'pivot.collapsibleGroups') ?? true;
  const defaultCollapsed = getConfigValue(cfg, 'pivot.defaultCollapsed') ?? false;
  const colorScale = getConfigValue(cfg, 'pivot.colorScale') ?? false;
  const fontSize = getConfigValue(cfg, 'dataLabels.fontSize') ?? 12;
  const borderColor = getConfigValue(cfg, 'dataLabels.borderColor') ?? '#e2e8f0';
  const totalFontWeight = getConfigValue(cfg, 'dataLabels.totalFontWeight') ?? 'bolder';

  // Enterprise additions
  const totalPosition = getConfigValue(cfg, 'pivot.totalPosition') ?? 'bottom';
  const showRowGrandTotal = getConfigValue(cfg, 'pivot.showRowGrandTotal') ?? showGrandTotal;
  const showColumnGrandTotal = getConfigValue(cfg, 'pivot.showColumnGrandTotal') ?? showGrandTotal;
  const showColumnSubTotals = getConfigValue(cfg, 'pivot.showColumnSubTotals') ?? showSubTotals;
  const density = getConfigValue(cfg, 'pivot.density') ?? 'comfortable';
  const showMiniBar = getConfigValue(cfg, 'pivot.showMiniBar') ?? false;
  const stickyRowHeaders = getConfigValue(cfg, 'pivot.stickyRowHeaders') ?? true;
  const numberFormat = getConfigValue(cfg, 'pivot.numberFormat') ?? 'auto';
  const decimalPlaces = getConfigValue(cfg, 'pivot.decimalPlaces') ?? 2;

  // States
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedColGroups, setCollapsedColGroups] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Map<string, Set<string>>>(new Map());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dimName?: string;
    value?: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolledX, setIsScrolledX] = useState(false);
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    document.addEventListener('click', handleCloseMenu);
    document.addEventListener('contextmenu', handleCloseMenu);
    return () => {
      document.removeEventListener('click', handleCloseMenu);
      document.removeEventListener('contextmenu', handleCloseMenu);
    };
  }, []);

  // Selection bar Drill Down states and refs
  const [showDrillDropdown, setShowDrillDropdown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setShowDrillDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (showDrillDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showDrillDropdown]);

  // Monitor horizontal scroll to add shadow to sticky columns
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolledX(e.currentTarget.scrollLeft > 2);
  };

  // Initialize default collapsed state
  useEffect(() => {
    if (defaultCollapsed && pivotData) {
      const allRowKeys = new Set<string>();
      const collectKeys = (node: any) => {
        if (node.children && node.children.size > 0 && node.key) {
          allRowKeys.add(node.key);
          node.children.forEach((child: any) => collectKeys(child));
        }
      };
      // Gather keys of non-leaves
      pivotData.uniqueRowKeys.forEach((rKey: string) => {
        const path = rKey.split('|||');
        if (path.length > 1) {
          for (let i = 1; i < path.length; i++) {
            allRowKeys.add(path.slice(0, i).join('|||'));
          }
        }
      });
      setCollapsedGroups(allRowKeys);
    }
  }, [defaultCollapsed, pivotData]);

  // Aggregate helpers
  const getMetricAggType = (metricName: string) => {
    if (!pivotData?.rawMetrics) return 'sum';
    const metricObj = pivotData.rawMetrics.find((m: any) =>
      (typeof m === 'string' && m === metricName) ||
      (typeof m === 'object' && (m.alias === metricName || m.name === metricName))
    );
    return (metricObj?.agg || 'sum').toLowerCase();
  };

  const aggregateValues = (values: number[], metricName: string) => {
    const agg = getMetricAggType(metricName);
    if (values.length === 0) return null;
    if (agg === 'avg') {
      return values.reduce((s, v) => s + v, 0) / values.length;
    }
    if (agg === 'min') {
      return Math.min(...values);
    }
    if (agg === 'max') {
      return Math.max(...values);
    }
    if (agg === 'count') {
      return values.length;
    }
    return values.reduce((s, v) => s + v, 0); // fallback sum
  };

  // Format Helper
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '-';
    if (typeof val !== 'number') return String(val);

    const formatted = val.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    if (numberFormat === 'currency') {
      return `$${formatted}`;
    }
    if (numberFormat === 'percent') {
      return `${(val * 100).toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })}%`;
    }
    return formatted;
  };

  // Build row & column structures
  const { rowTree, leafColumns, rowDimNames, colDimNames, measureNames } = useMemo(() => {
    if (pivotData) {
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
              .filter(v => v !== null && v !== undefined) as number[];
            
            node.aggregations[lc.key] = aggregateNodeValues(childValues, lc.metricName);
          });
        }
      };

      const aggregateNodeValues = (values: number[], metricName: string) => {
        return aggregateValues(values, metricName);
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

    // Fallback block if pivotData is empty
    const fallbackRowDimNames = dimensions?.map(d => d.name) || (categories ? ['Dimension'] : ['Index']);
    const fallbackMeasureNames = series.map(s => s.name);
    const fallbackLeafColumns = series.map(s => ({ key: s.name, colValues: [], metricName: s.name }));
    
    const tree = { children: new Map() };
    const fallbackLookup: any = {};
    const rowCount = dimensions?.[0]?.data?.length || categories?.length || 0;

    for (let rIdx = 0; rIdx < rowCount; rIdx++) {
      const rowPath = dimensions && dimensions.length > 0 
        ? dimensions.map(d => toSafeCategoryValue(d.data?.[rIdx]))
        : [categories?.[rIdx] !== undefined ? toSafeCategoryValue(categories?.[rIdx]) : `Row ${rIdx + 1}`];
      
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
            .filter(v => v !== null && v !== undefined) as number[];
          node.aggregations[lc.key] = childValues.length === 0 ? null : childValues.reduce((s, v) => s + Number(v), 0);
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

  // Generate flatRows list
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

  const filteredFlatRows = flatRows;

  // Column Hierarchy Tree
  const colTree = useMemo(() => {
    const root = { children: new Map(), leafCols: [] as any[] };
    leafColumns.forEach(lc => {
      let current: any = root;
      current.leafCols.push(lc);
      lc.colValues.forEach((val: string, level: number) => {
        if (!current.children.has(val)) {
          current.children.set(val, {
            key: lc.colValues.slice(0, level + 1).join('|||'),
            value: val,
            level,
            children: new Map(),
            leafCols: []
          });
        }
        current = current.children.get(val);
        current.leafCols.push(lc);
      });
    });
    return root;
  }, [leafColumns]);

  // Dynamic visibleColumns generation (supporting Column Collapsing and Subtotals)
  interface PivotColumn {
    key: string;
    colValues: string[];
    metricName: string;
    isSubtotal?: boolean;
    subtotalPath?: string[];
    isGrandTotal?: boolean;
    leafCols: any[];
  }

  const visibleColumns = useMemo(() => {
    const generateVisibleCols = (node: any): PivotColumn[] => {
      const cols: PivotColumn[] = [];
      
      if (node.key && collapsedColGroups.has(node.key)) {
        const metricsUnderNode = Array.from(new Set(node.leafCols.map((c: any) => c.metricName))) as string[];
        metricsUnderNode.forEach((m: string) => {
          cols.push({
            key: `col-subtotal|||${node.key}|||${m}`,
            colValues: [...node.leafCols[0].colValues.slice(0, node.level + 1), 'Subtotal'],
            metricName: m,
            isSubtotal: true,
            subtotalPath: node.leafCols[0].colValues.slice(0, node.level + 1),
            leafCols: node.leafCols.filter((c: any) => c.metricName === m)
          });
        });
        return cols;
      }
      
      if (node.children.size === 0) {
        node.leafCols.forEach((lc: any) => {
          cols.push({
            key: lc.key,
            colValues: lc.colValues,
            metricName: lc.metricName,
            leafCols: [lc]
          });
        });
      } else {
        const sortedChildren = Array.from(node.children.values()).sort((a: any, b: any) =>
          String(a.value).localeCompare(String(b.value), undefined, { numeric: true, sensitivity: 'base' })
        );
        sortedChildren.forEach(child => {
          cols.push(...generateVisibleCols(child));
        });
        
        if (showColumnSubTotals && node.key) {
          const metricsUnderNode = Array.from(new Set(node.leafCols.map((c: any) => c.metricName))) as string[];
          metricsUnderNode.forEach((m: string) => {
            cols.push({
              key: `col-subtotal|||${node.key}|||subtotal|||${m}`,
              colValues: [...node.leafCols[0].colValues.slice(0, node.level + 1), 'Total'],
              metricName: m,
              isSubtotal: true,
              subtotalPath: node.leafCols[0].colValues.slice(0, node.level + 1),
              leafCols: node.leafCols.filter((c: any) => c.metricName === m)
            });
          });
        }
      }
      return cols;
    };

    const cols = generateVisibleCols(colTree);

    // Append Column Grand Totals
    if (showColumnGrandTotal && colDimNames.length > 0) {
      measureNames.forEach(m => {
        cols.push({
          key: `row-grand-total|||${m}`,
          colValues: ['Grand Total'],
          metricName: m,
          isGrandTotal: true,
          leafCols: leafColumns.filter(lc => lc.metricName === m)
        });
      });
    }

    return cols;
  }, [colTree, collapsedColGroups, showColumnSubTotals, showColumnGrandTotal, colDimNames, measureNames, leafColumns]);

  // Cell values extractor
  const getCellValue = (row: any, col: PivotColumn) => {
    if (col.isGrandTotal || col.isSubtotal) {
      const values = col.leafCols
        .map((lc: any) => row.values[lc.key])
        .filter(v => v !== null && v !== undefined) as number[];
      return aggregateValues(values, col.metricName);
    }
    return row.values[col.key] ?? null;
  };

  // Grand totals of columns (bottom/top row grand totals)
  const columnGrandTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    visibleColumns.forEach(col => {
      const leafRowValues = flatRows
        .filter(r => r.type === 'leaf')
        .map(r => getCellValue(r, col))
        .filter(v => v !== null && v !== undefined) as number[];
      totals[col.key] = aggregateValues(leafRowValues, col.metricName);
    });
    return totals;
  }, [flatRows, visibleColumns]);

  // Max value in column (for mini-bars)
  const columnMaxValues = useMemo(() => {
    const maxes: Record<string, number> = {};
    visibleColumns.forEach(col => {
      const vals = flatRows
        .filter(r => r.type === 'leaf')
        .map(r => getCellValue(r, col))
        .filter(v => typeof v === 'number') as number[];
      maxes[col.key] = vals.length > 0 ? Math.max(...vals, 0) : 0;
    });
    return maxes;
  }, [flatRows, visibleColumns]);

  // Color scale calculations
  const cellValuesForColorScale = useMemo(() => {
    const values: number[] = [];
    flatRows.forEach(r => {
      if (r.type === 'leaf') {
        visibleColumns.forEach(col => {
          if (!col.isGrandTotal && !col.isSubtotal) {
            const v = getCellValue(r, col);
            if (typeof v === 'number') values.push(v);
          }
        });
      }
    });
    return values;
  }, [flatRows, visibleColumns]);

  const minVal = Math.min(...cellValuesForColorScale, 0);
  const maxVal = Math.max(...cellValuesForColorScale, 1);

  const getColorForValue = (val: number) => {
    if (!colorScale || val === null || val === undefined) return undefined;
    const ratio = (val - minVal) / (maxVal - minVal);
    const hue = 220; // Slate blue
    return `hsla(${hue}, 85%, 90%, ${0.1 + ratio * 0.8})`;
  };

  // Selection toggle helper
  const handleCellClick = (e: React.MouseEvent, dimName: string, value: string) => {
    setSelectedCells(prev => {
      const next = new Map(prev);
      const currentSet = next.get(dimName);
      if (!currentSet) {
        // Not selected yet: add it
        next.set(dimName, new Set([value]));
      } else {
        const newSet = new Set(currentSet);
        if (newSet.has(value)) {
          // Already selected: toggle off (remove it)
          newSet.delete(value);
          if (newSet.size === 0) {
            next.delete(dimName);
          } else {
            next.set(dimName, newSet);
          }
        } else {
          // Not selected: toggle on (add it)
          newSet.add(value);
          next.set(dimName, newSet);
        }
      }
      return next;
    });
  };

  const handleApplyFilters = () => {
    const filters: Record<string, string[]> = {};
    selectedCells.forEach((values, dim) => {
      filters[dim] = Array.from(values);
    });
    onFilterByValue?.(filters);
    setSelectedCells(new Map());
  };

  const handleApplyExcludes = () => {
    const filters: Record<string, string[]> = {};
    selectedCells.forEach((values, dim) => {
      filters[dim] = Array.from(values);
    });
    onExcludeValue?.(filters);
    setSelectedCells(new Map());
  };

  const totalSelectedCount = Array.from(selectedCells.values()).reduce((sum, set) => sum + set.size, 0);

  const handleApplyDrill = (targetCol: string) => {
    selectedCells.forEach((values, dim) => {
      onDrillDown?.(dim, targetCol, Array.from(values));
    });
    setSelectedCells(new Map());
    setShowDrillDropdown(false);
  };


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

  const toggleColGroup = (pathKey: string) => {
    setCollapsedColGroups(prev => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  };

  // Row header cell renderer (handles vertical span and tree-like collapsing)
  const getRowHeaderCell = (rowIndex: number, colIdx: number) => {
    const r = filteredFlatRows[rowIndex];
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
        const isFirst = rowIndex === 0 || filteredFlatRows[rowIndex - 1].path[colIdx] !== r.path[colIdx];
        if (isFirst) {
          let rowSpan = 1;
          for (let i = rowIndex + 1; i < filteredFlatRows.length; i++) {
            if (filteredFlatRows[i].path[colIdx] === r.path[colIdx]) {
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
    const isFirst = rowIndex === 0 || filteredFlatRows[rowIndex - 1].path[colIdx] !== r.path[colIdx];
    if (isFirst) {
      let rowSpan = 1;
      for (let i = rowIndex + 1; i < filteredFlatRows.length; i++) {
        if (filteredFlatRows[i].path[colIdx] === r.path[colIdx]) {
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

  // Column header cell renderer (handles horizontal span and column collapsing)
  const getColHeaderCell = (rowIdx: number, visibleColIdx: number) => {
    const L = colDimNames.length;
    const col = visibleColumns[visibleColIdx];
    
    if (rowIdx === L) {
      return {
        render: true,
        colSpan: 1,
        label: col.metricName
      };
    }

    const prefix = col.colValues.slice(0, rowIdx + 1);
    const prefixKey = prefix.join('|||');

    const isFirst = visibleColIdx === 0 || 
      visibleColumns[visibleColIdx - 1].colValues.slice(0, rowIdx + 1).join('|||') !== prefixKey;

    if (isFirst) {
      let colSpan = 1;
      for (let i = visibleColIdx + 1; i < visibleColumns.length; i++) {
        if (visibleColumns[i].colValues.slice(0, rowIdx + 1).join('|||') === prefixKey) {
          colSpan++;
        } else {
          break;
        }
      }
      return {
        render: true,
        colSpan,
        label: col.colValues[rowIdx] || '',
        isCollapsible: rowIdx < L,
        pathKey: col.colValues.slice(0, rowIdx + 1).join('|||'),
        isCollapsed: collapsedColGroups.has(col.colValues.slice(0, rowIdx + 1).join('|||'))
      };
    }

    return { render: false };
  };

  // Sticky col calculations
  // Sticky col calculations
  const getStickyLeft = (colIdx: number) => {
    return stickyRowHeaders ? `${colIdx * 140}px` : undefined;
  };

  const handleContainerContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };


  // Expand / Collapse all actions
  const expandAllRows = () => {
    setCollapsedGroups(new Set());
  };

  const collapseAllRows = () => {
    const allKeys = new Set<string>();
    const collectKeys = (node: any) => {
      if (node.children && node.children.size > 0 && node.key) {
        allKeys.add(node.key);
        node.children.forEach((child: any) => collectKeys(child));
      }
    };
    if (rowTree) {
      rowTree.children.forEach(child => collectKeys(child));
    }
    setCollapsedGroups(allKeys);
  };

  const expandAllCols = () => {
    setCollapsedColGroups(new Set());
  };

  const collapseAllCols = () => {
    const allKeys = new Set<string>();
    const collectKeys = (node: any) => {
      if (node.children && node.children.size > 0 && node.key) {
        allKeys.add(node.key);
        node.children.forEach((child: any) => collectKeys(child));
      }
    };
    colTree.children.forEach(child => collectKeys(child));
    setCollapsedColGroups(allKeys);
  };

  // Grand totals row component
  const GrandTotalsRow = () => (
    <tr className="pivot-row-grand-total">
      <td
        colSpan={rowDimNames.length}
        className="px-3 py-2.5 font-extrabold uppercase tracking-wide border-r text-right bg-slate-50/80 dark:bg-slate-800/50 pivot-sticky-col"
        style={{
          color: themeMeta?.text || '#1e293b',
          borderColor: themeMeta?.border || borderColor || '#e2e8f0',
          left: stickyRowHeaders ? '0px' : undefined,
        }}
      >
        Grand Total
      </td>
      {visibleColumns.map((col, idx) => {
        const val = columnGrandTotals[col.key];
        const isNull = val === null || val === undefined;
        return (
          <td
            key={`grand-total-${idx}`}
            className={`px-3 py-2.5 pivot-value-cell ${col.isGrandTotal ? 'pivot-col-total' : ''}`}
            style={{
              color: col.isGrandTotal ? undefined : (themeMeta?.primary || '#6366f1'),
              borderColor: themeMeta?.border || borderColor || '#e2e8f0',
            }}
          >
            {formatValue(val)}
          </td>
        );
      })}
    </tr>
  );

  const availableDrillTargets = availableColumns.filter(col => col !== currentDimensionName);

  const containerStyle = {
    '--pivot-bg': themeMeta?.background || '#ffffff',
    '--pivot-bg-even': themeMeta?.background 
      ? `linear-gradient(rgba(0, 0, 0, 0.025), rgba(0, 0, 0, 0.025)), ${themeMeta.background}`
      : '#f8fafc',
    '--pivot-header-bg': themeMeta?.background || '#f8fafc',
    '--pivot-border': themeMeta?.border || '#e2e8f0',
    '--pivot-text': themeMeta?.text || '#1e293b',
    '--pivot-hover': themeMeta?.background 
      ? `linear-gradient(rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04)), ${themeMeta.background}`
      : '#f1f5f9',
    backgroundColor: themeMeta?.background || '#ffffff',
  } as React.CSSProperties;

  return (
    <div 
      className={`pivot-table-container pivot-density-${density} ${isScrolledX ? 'is-scrolled-x' : ''}`} 
      onContextMenu={handleContainerContextMenu}
      style={containerStyle}
    >
      <div className="pivot-table-scrollable" onScroll={handleScroll}>
        {/* Pivot Core Table */}
        <table className="pivot-table" style={{ fontSize: `${fontSize}px` }}>
        
        {/* Table Headers */}
        <thead>
          {Array.from({ length: colHeaderRowsCount }).map((_, rowIdx) => {
            return (
              <tr 
                key={`col-head-row-${rowIdx}`}
                className="border-b"
                style={{ borderColor: themeMeta?.border || borderColor || '#e2e8f0' }}
              >
                {/* Empty / Label Corner Cells */}
                {rowIdx === 0 && colDimNames.length > 0 && rowDimNames.map((_, dIdx) => (
                  <th
                    key={`corner-empty-${dIdx}`}
                    rowSpan={colDimNames.length}
                    className="px-3 py-2 border-r pivot-sticky-col"
                    style={{ 
                      borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                      left: stickyRowHeaders ? getStickyLeft(dIdx) : undefined,
                      width: stickyRowHeaders ? '140px' : undefined,
                      minWidth: stickyRowHeaders ? '140px' : undefined,
                      maxWidth: stickyRowHeaders ? '140px' : undefined,
                    }}
                  />
                ))}
                
                {rowIdx === colDimNames.length && rowDimNames.map((name, dIdx) => (
                  <th
                    key={`corner-label-${dIdx}`}
                    className="px-3 py-2 border-r font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider pivot-sticky-col"
                    style={{
                      color: themeMeta?.text || '#1e293b',
                      borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                      left: stickyRowHeaders ? getStickyLeft(dIdx) : undefined,
                      width: stickyRowHeaders ? '140px' : undefined,
                      minWidth: stickyRowHeaders ? '140px' : undefined,
                      maxWidth: stickyRowHeaders ? '140px' : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5 justify-between">
                      <span>{name}</span>
                    </div>
                  </th>
                ))}

                {/* Column Dimension Headers */}
                {visibleColumns.map((col, visibleColIdx) => {
                  const cell = getColHeaderCell(rowIdx, visibleColIdx);
                  if (!cell.render) return null;
                  
                  return (
                    <th
                      key={`col-cell-${rowIdx}-${visibleColIdx}`}
                      colSpan={cell.colSpan}
                      className={`px-3 py-2 border-r text-center font-bold whitespace-nowrap ${
                        col.isGrandTotal ? 'pivot-col-total text-indigo-600' : ''
                      }`}
                      style={{
                        color: col.isGrandTotal ? undefined : (themeMeta?.text || '#1e293b'),
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                      }}
                    >
                      <div className="inline-flex items-center justify-center gap-1">
                        {cell.isCollapsible && cell.label && (
                          <button
                            onClick={() => toggleColGroup(cell.pathKey!)}
                            className="p-0.5 hover:bg-slate-200/50 rounded transition-colors"
                          >
                            {cell.isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                          </button>
                        )}
                        <span>{cell.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>

        {/* Table Body */}
        <tbody>
          
          {/* Top Grand Totals Row */}
          {showRowGrandTotal && totalPosition === 'top' && <GrandTotalsRow />}

          {filteredFlatRows.map((r, rowIndex) => {
            const isSubtotalRow = r.type === 'subtotal';
            const isCollapsedRow = r.type === 'collapsed-group';
            
            return (
              <tr
                key={`row-${r.key}`}
                className={`pivot-row-${rowIndex % 2 === 0 ? 'even' : 'odd'} ${
                  isSubtotalRow ? 'pivot-row-subtotal font-bold' : ''
                } ${isCollapsedRow ? 'bg-slate-100/30 dark:bg-slate-800/5 font-medium' : ''}`}
              >
                {/* Row Header Dimensions */}
                {rowDimNames.map((dimName, colIdx) => {
                  const cell = getRowHeaderCell(rowIndex, colIdx);
                  if (!cell.render) return null;
                  
                  const cellSelected = selectedCells.get(dimName)?.has(String(cell.label));
                  
                  return (
                    <td
                      key={`row-header-val-${rowIndex}-${colIdx}`}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      onClick={(e) => {
                        if (!cell.isSubtotal) {
                          handleCellClick(e, dimName, String(cell.label));
                        }
                      }}
                      className={`pivot-row-header pivot-sticky-col ${cellSelected ? 'pivot-cell--selected' : ''}`}
                      style={{
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                        color: themeMeta?.text || '#1e293b',
                        left: stickyRowHeaders ? getStickyLeft(colIdx) : undefined,
                        width: (stickyRowHeaders && cell.colSpan === 1) ? '140px' : undefined,
                        minWidth: (stickyRowHeaders && cell.colSpan === 1) ? '140px' : undefined,
                        maxWidth: (stickyRowHeaders && cell.colSpan === 1) ? '140px' : undefined,
                      }}
                    >
                      <div className="pivot-row-header-content">
                        <span className={`truncate ${(cell.label === '__NULL__' || cell.label === '__EMPTY__') ? 'italic text-slate-400 font-normal' : ''}`}>
                          {displayCategoryValue(cell.label)}
                        </span>
                      </div>
                    </td>
                  );
                })}

                {/* Values cells */}
                {visibleColumns.map((col, visibleColIdx) => {
                  const val = getCellValue(r, col);
                  const isNull = val === null || val === undefined;
                  const isRowTotal = col.isGrandTotal;
                  
                  // Compute bar percentage
                  const maxVal = columnMaxValues[col.key] || 1;
                  const pct = maxVal > 0 ? Math.min(100, Math.max(0, (Number(val) / maxVal) * 100)) : 0;

                  return (
                    <td
                      key={`cell-val-${rowIndex}-${visibleColIdx}`}
                      onMouseEnter={() => setHoveredColKey(col.key)}
                      onMouseLeave={() => setHoveredColKey(null)}
                      className={`pivot-value-cell ${isRowTotal ? 'pivot-col-total' : ''} ${
                        hoveredColKey === col.key ? 'pivot-col-hover' : ''
                      } ${isNull ? 'pivot-value-cell--null' : ''}`}
                      style={{
                        color: isRowTotal ? (themeMeta?.primary || '#4f46e5') : (themeMeta?.text || '#1e293b'),
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                        backgroundColor: isNull ? undefined : getColorForValue(val),
                        fontWeight: (isRowTotal || isSubtotalRow) ? totalFontWeight as any : 'normal',
                      }}
                    >
                      <span>{formatValue(val)}</span>
                      
                      {/* Mini Bar Visualizer */}
                      {showMiniBar && typeof val === 'number' && !isRowTotal && !isSubtotalRow && (
                        <div className="pivot-mini-bar">
                          <div 
                            className="pivot-mini-bar-fill" 
                            style={{ 
                              width: `${pct}%`, 
                              backgroundColor: themeMeta?.primary || '#6366f1' 
                            }} 
                          />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Bottom Grand Totals Row */}
          {showRowGrandTotal && totalPosition === 'bottom' && <GrandTotalsRow />}
        </tbody>
      </table>
      </div>

      {/* Floating Action Bar / Drill Menu (shows only when selection is active) */}
      {totalSelectedCount > 0 && (
        <div className="pivot-selection-bar">
          <span className="pivot-selection-bar-count">{totalSelectedCount}</span>
          <span>selected</span>
          
          <button className="pivot-selection-bar-btn" onClick={handleApplyFilters}>
            <Filter size={11} /> Filter
          </button>
          
          <button className="pivot-selection-bar-btn pivot-selection-bar-btn--danger" onClick={handleApplyExcludes}>
            <X size={11} /> Exclude
          </button>

          {/* Drill Down options */}
          {availableDrillTargets.length > 0 && (
            <div>
              <button 
                ref={buttonRef}
                className="pivot-selection-bar-btn" 
                onClick={() => setShowDrillDropdown(!showDrillDropdown)}
              >
                <Layers size={11} /> Drill Down
              </button>
              
              {showDrillDropdown && createPortal(
                <div 
                  ref={dropdownRef}
                  style={{
                    position: 'fixed',
                    left: dropdownPos.left,
                    top: dropdownPos.top - 4,
                    transform: 'translateY(-100%)',
                    width: '180px',
                    zIndex: 99999,
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 text-slate-800 dark:text-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-1"
                >
                  <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    Drill dimension
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {availableDrillTargets.map(col => (
                      <button
                        key={col}
                        onClick={() => handleApplyDrill(col)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {col}
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}
          
          <button 
            className="pivot-selection-bar-btn pivot-selection-bar-btn--clear" 
            onClick={() => setSelectedCells(new Map())}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Context Menu / Drill Menu */}
      {contextMenu && createPortal(
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 99999,
          }}
          className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 text-slate-800 dark:text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[9px]">
            Table Options
          </div>
          
          <button
            onClick={expandAllRows}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            Expand All Rows
          </button>
          
          <button
            onClick={collapseAllRows}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            Collapse All Rows
          </button>

          {colDimNames.length > 0 && (
            <>
              <button
                onClick={expandAllCols}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                Expand All Columns
              </button>
              
              <button
                onClick={collapseAllCols}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                Collapse All Columns
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default PivotTableChart;
