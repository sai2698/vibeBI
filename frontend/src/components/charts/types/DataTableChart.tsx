import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, ArrowUpDown, Layers, X, Filter } from 'lucide-react';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';

export interface DataTableChartProps {
  categories?: string[];
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
  }>;
  visualConfig?: {
    table?: {
      pageSize?: number;
      showPagination?: boolean;
      sortable?: boolean;
      searchable?: boolean;
      showRowNumbers?: boolean;
      stripeRows?: boolean;
      hoverHighlight?: boolean;
      includeColumns?: string;
      excludeColumns?: string;
      showGrandTotal?: boolean;
      totalPosition?: 'top' | 'bottom';
      density?: 'compact' | 'comfortable' | 'spacious';
      showMiniBar?: boolean;
      colorScale?: boolean;
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
  onDrillContextMenu?: (e: React.MouseEvent, cellValue: string, colName: string) => void;
  onDrillDown?: (fromDimension: string, toDimension: string, clickedValue: string | string[]) => void;
  onFilterByValue?: (column: string | Record<string, string[]>, value?: string | string[]) => void;
  onExcludeValue?: (column: string | Record<string, string[]>, value?: string | string[]) => void;
  availableColumns?: string[];
  currentDimensionName?: string;
}

export const dataTableChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'dataTable',
  sections: [
    {
      id: 'table',
      title: 'Table Settings',
      icon: 'Table',
      defaultExpanded: true,
      fields: [
        {
          key: 'table.pageSize',
          label: 'Page Size',
          type: 'select',
          options: [
            { label: '10 rows', value: '10' },
            { label: '25 rows', value: '25' },
            { label: '50 rows', value: '50' },
            { label: '100 rows', value: '100' },
            { label: 'All', value: '0' },
          ],
          defaultValue: '10',
          description: 'Number of rows per page',
        },
        {
          key: 'table.showPagination',
          label: 'Show Pagination',
          type: 'boolean',
          defaultValue: true,
          description: 'Display pagination controls',
        },
        {
          key: 'table.sortable',
          label: 'Sortable',
          type: 'boolean',
          defaultValue: true,
          description: 'Allow column sorting',
        },
        {
          key: 'table.searchable',
          label: 'Searchable',
          type: 'boolean',
          defaultValue: true,
          description: 'Show search box',
        },
        {
          key: 'table.showRowNumbers',
          label: 'Show Row Numbers',
          type: 'boolean',
          defaultValue: false,
          description: 'Display row numbers',
        },
        {
          key: 'table.stripeRows',
          label: 'Striped Rows',
          type: 'boolean',
          defaultValue: true,
          description: 'Alternate row colors',
        },
        {
          key: 'table.hoverHighlight',
          label: 'Hover Highlight',
          type: 'boolean',
          defaultValue: true,
          description: 'Highlight row on hover',
        },
        {
          key: 'table.includeColumns',
          label: 'Include Columns',
          type: 'text',
          placeholder: 'e.g. col1, col2',
          description: 'Comma-separated names of columns to show (if empty, all are shown)',
        },
        {
          key: 'table.excludeColumns',
          label: 'Exclude Columns',
          type: 'text',
          placeholder: 'e.g. col3, col4',
          description: 'Comma-separated names of columns to hide',
        },
        {
          key: 'table.showGrandTotal',
          label: 'Show Grand Total',
          type: 'boolean',
          defaultValue: false,
          description: 'Display grand total row',
        },
        {
          key: 'table.totalPosition',
          label: 'Totals Position',
          type: 'select',
          options: [
            { label: 'Bottom', value: 'bottom' },
            { label: 'Top', value: 'top' },
          ],
          defaultValue: 'bottom',
          description: 'Show Grand Total at the top or bottom of the table',
        },
        {
          key: 'table.density',
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
          key: 'table.showMiniBar',
          label: 'Inline Mini-Bars',
          type: 'boolean',
          defaultValue: false,
          description: 'Show visual mini-bars in metric cells',
        },
        {
          key: 'table.colorScale',
          label: 'Color Scale Heatmap',
          type: 'boolean',
          defaultValue: false,
          description: 'Apply heatmap color scale to values',
        },
        {
          key: 'table.numberFormat',
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
          key: 'table.decimalPlaces',
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
          defaultValue: 14,
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
          description: 'Font weight for total row',
        },
      ],
    },
  ],
  defaultConfig: {
    table: {
      pageSize: 10,
      showPagination: true,
      sortable: true,
      searchable: true,
      showRowNumbers: false,
      stripeRows: true,
      hoverHighlight: true,
      includeColumns: '',
      excludeColumns: '',
      showGrandTotal: false,
      totalPosition: 'bottom',
      density: 'comfortable',
      showMiniBar: false,
      colorScale: false,
      numberFormat: 'auto',
      decimalPlaces: 2,
    },
    dataLabels: {
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      headerBackgroundColor: '#f1f5f9',
      headerColor: '#1e293b',
      rowColor: '#ffffff',
      borderColor: '#e2e8f0',
      totalFontWeight: 'bolder',
    },
  },
});

export function buildDataTableChartOptions(_props: DataTableChartProps): any {
  return { series: [] };
}

export const DataTableChart: React.FC<DataTableChartProps> = ({
  categories,
  dimensions,
  series,
  visualConfig = {},
  themeMeta,
  onDrillContextMenu,
  onDrillDown,
  onFilterByValue,
  onExcludeValue,
  availableColumns = [],
  currentDimensionName = '',
}) => {
  const cfg = visualConfig;
  
  // Table configs
  const showGrandTotal = getConfigValue(cfg, 'table.showGrandTotal') ?? false;
  const totalPosition = getConfigValue(cfg, 'table.totalPosition') ?? 'bottom';
  const density = getConfigValue(cfg, 'table.density') ?? 'comfortable';
  const showMiniBar = getConfigValue(cfg, 'table.showMiniBar') ?? false;
  const colorScale = getConfigValue(cfg, 'table.colorScale') ?? false;
  const numberFormat = getConfigValue(cfg, 'table.numberFormat') ?? 'auto';
  const decimalPlaces = getConfigValue(cfg, 'table.decimalPlaces') ?? 2;
  const stripeRows = getConfigValue(cfg, 'table.stripeRows') ?? true;
  const hoverHighlight = getConfigValue(cfg, 'table.hoverHighlight') ?? true;

  // Appearance configs
  const fontSize = getConfigValue(cfg, 'dataLabels.fontSize') ?? 14;
  const borderColor = getConfigValue(cfg, 'dataLabels.borderColor') ?? '#e2e8f0';
  const totalFontWeight = getConfigValue(cfg, 'dataLabels.totalFontWeight') ?? 'bolder';

  // State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: '',
    direction: null,
  });
  const [selectedCells, setSelectedCells] = useState<Map<string, Set<string>>>(new Map());
  const [showDrillDropdown, setShowDrillDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Include/Exclude column logic
  const includeCols = useMemo(() => {
    const raw = getConfigValue(cfg, 'table.includeColumns') || '';
    if (!raw.trim()) return null;
    return raw.split(',').map((s: string) => s.trim().toLowerCase());
  }, [cfg]);

  const excludeCols = useMemo(() => {
    const raw = getConfigValue(cfg, 'table.excludeColumns') || '';
    if (!raw.trim()) return [];
    return raw.split(',').map((s: string) => s.trim().toLowerCase());
  }, [cfg]);

  const shouldShowColumn = (name: string) => {
    const lowerName = name.toLowerCase();
    if (excludeCols.includes(lowerName)) return false;
    if (includeCols !== null) return includeCols.includes(lowerName);
    return true;
  };

  const visibleDimensions = useMemo(() => {
    return (dimensions || []).filter(d => shouldShowColumn(d.name));
  }, [dimensions, includeCols, excludeCols]);

  const visibleSeries = useMemo(() => {
    return (series || []).filter(s => shouldShowColumn(s.name));
  }, [series, includeCols, excludeCols]);

  const showDimensionCol = useMemo(() => {
    if (dimensions && dimensions.length > 0) return false;
    const name = categories ? 'Dimension' : 'Index';
    return shouldShowColumn(name);
  }, [dimensions, categories, includeCols, excludeCols]);

  const rowCount = dimensions?.[0]?.data?.length || categories?.length || 0;

  // Sorting
  const sortedRows = useMemo(() => {
    const rowIndices = Array.from({ length: rowCount }, (_, i) => i);

    if (!sortConfig.key || !sortConfig.direction) return rowIndices;

    return [...rowIndices].sort((a, b) => {
      let valA: any, valB: any;

      const dim = dimensions?.find(d => d.name === sortConfig.key);
      if (dim) {
        valA = dim.data[a];
        valB = dim.data[b];
      } else if (sortConfig.key === 'Dimension' && categories) {
        valA = categories[a];
        valB = categories[b];
      } else {
        const ser = series.find(s => s.name === sortConfig.key);
        if (ser && ser.data) {
          valA = ser.data[a];
          valB = ser.data[b];
        }
      }

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const result = valA < valB ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [dimensions, categories, series, sortConfig, rowCount]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc') : 'asc',
    }));
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig.key !== colKey || !sortConfig.direction) {
      return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={12} style={{ color: themeMeta?.primary || '#6366F1' }} />
    ) : (
      <ChevronDown size={12} style={{ color: themeMeta?.primary || '#6366F1' }} />
    );
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

  // Selection toggle helper
  const handleCellClick = (_e: React.MouseEvent, dimName: string, value: string) => {
    setSelectedCells(prev => {
      const next = new Map(prev);
      const currentSet = next.get(dimName);
      if (!currentSet) {
        next.set(dimName, new Set([value]));
      } else {
        const newSet = new Set(currentSet);
        if (newSet.has(value)) {
          newSet.delete(value);
          if (newSet.size === 0) {
            next.delete(dimName);
          } else {
            next.set(dimName, newSet);
          }
        } else {
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

  const handleApplyDrill = (targetCol: string) => {
    selectedCells.forEach((values, dim) => {
      onDrillDown?.(dim, targetCol, Array.from(values));
    });
    setSelectedCells(new Map());
    setShowDrillDropdown(false);
  };

  const totalSelectedCount = Array.from(selectedCells.values()).reduce((sum, set) => sum + set.size, 0);

  // Grand totals of columns
  const columnGrandTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    visibleSeries.forEach(s => {
      if (s.data) {
        const numericValues = s.data.filter(v => typeof v === 'number') as number[];
        totals[s.name] = numericValues.length > 0 ? numericValues.reduce((sum, v) => sum + v, 0) : null;
      } else {
        totals[s.name] = null;
      }
    });
    return totals;
  }, [visibleSeries, rowCount]);

  // Max value in column (for mini-bars)
  const columnMaxValues = useMemo(() => {
    const maxes: Record<string, number> = {};
    visibleSeries.forEach(s => {
      if (s.data) {
        const vals = s.data.filter(v => typeof v === 'number') as number[];
        maxes[s.name] = vals.length > 0 ? Math.max(...vals, 0) : 0;
      } else {
        maxes[s.name] = 0;
      }
    });
    return maxes;
  }, [visibleSeries, rowCount]);

  // Color scale calculations
  const cellValuesForColorScale = useMemo(() => {
    const values: number[] = [];
    visibleSeries.forEach(s => {
      if (s.data) {
        s.data.forEach(v => {
          if (typeof v === 'number') values.push(v);
        });
      }
    });
    return values;
  }, [visibleSeries, rowCount]);

  const minVal = Math.min(...cellValuesForColorScale, 0);
  const maxVal = Math.max(...cellValuesForColorScale, 1);

  const getColorForValue = (val: number) => {
    if (!colorScale || val === null || val === undefined) return undefined;
    const ratio = (val - minVal) / (maxVal - minVal);
    const hue = 220; // Slate blue
    return `hsla(${hue}, 85%, 90%, ${0.1 + ratio * 0.8})`;
  };

  const availableDrillTargets = availableColumns.filter(col => col !== currentDimensionName);

  const GrandTotalsRow = () => (
    <tr className="pivot-row-grand-total">
      {visibleDimensions.map((_, idx) => (
        <td
          key={`grand-total-dim-${idx}`}
          className="px-3 py-2.5 font-extrabold uppercase tracking-wide border-r text-right bg-slate-50/80 dark:bg-slate-800/50"
          style={{
            color: themeMeta?.text || '#1e293b',
            borderColor: themeMeta?.border || borderColor || '#e2e8f0',
          }}
        >
          {idx === visibleDimensions.length - 1 ? 'Grand Total' : ''}
        </td>
      ))}
      {showDimensionCol && (
        <td
          className="px-3 py-2.5 font-extrabold uppercase tracking-wide border-r text-right bg-slate-50/80 dark:bg-slate-800/50"
          style={{
            color: themeMeta?.text || '#1e293b',
            borderColor: themeMeta?.border || borderColor || '#e2e8f0',
          }}
        >
          Grand Total
        </td>
      )}
      {visibleSeries.map((s, idx) => {
        const val = columnGrandTotals[s.name];
        return (
          <td
            key={`grand-total-val-${idx}`}
            className="px-3 py-2.5 text-right font-extrabold border-r last:border-r-0"
            style={{
              color: themeMeta?.primary || '#6366f1',
              borderColor: themeMeta?.border || borderColor || '#e2e8f0',
              fontWeight: totalFontWeight as any,
            }}
          >
            {formatValue(val)}
          </td>
        );
      })}
    </tr>
  );

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
      className={`w-full h-full overflow-hidden flex flex-col relative pivot-table-container pivot-density-${density}`}
      style={containerStyle}
    >
      <div className="w-full h-full overflow-auto pivot-table-scrollable">
        <table className="w-full text-left border-collapse min-w-full pivot-table" style={{ fontSize: `${fontSize}px` }}>
          <thead
            className="sticky top-0 z-10 border-b-2"
            style={{
              backgroundColor: themeMeta?.background || '#f1f5f9',
              borderBottomColor: themeMeta?.primary || '#6366F1',
            }}
          >
            <tr>
              {visibleDimensions.map((d, i) => (
                <th
                  key={`dim-${i}`}
                  className="px-3 py-2 font-extrabold uppercase tracking-wider border-r cursor-pointer group hover:bg-black/5 transition-colors"
                  style={{
                    color: themeMeta?.text || '#1e293b',
                    borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                  }}
                  onClick={() => toggleSort(d.name)}
                >
                  <div className="flex items-center justify-between gap-2">
                    {d.name}
                    <SortIcon colKey={d.name} />
                  </div>
                </th>
              ))}
              {showDimensionCol && (
                <th
                  className="px-3 py-2 font-extrabold uppercase tracking-wider border-r cursor-pointer group hover:bg-black/5 transition-colors"
                  style={{
                    color: themeMeta?.text || '#1e293b',
                    borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                  }}
                  onClick={() => toggleSort('Dimension')}
                >
                  <div className="flex items-center justify-between gap-2">
                    {categories ? 'Dimension' : 'Index'}
                    <SortIcon colKey="Dimension" />
                  </div>
                </th>
              )}
              {visibleSeries.map((s, i) => (
                <th
                  key={`ser-${i}`}
                  className="px-3 py-2 font-bold border-r last:border-r-0 cursor-pointer group hover:bg-black/5 transition-colors"
                  style={{
                    color: themeMeta?.secondary || '#8B5CF6',
                    borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                  }}
                  onClick={() => toggleSort(s.name)}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span className="truncate max-w-[150px]" title={s.name}>
                      {s.name}
                    </span>
                    <SortIcon colKey={s.name} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{
              borderColor: themeMeta?.border || borderColor || '#e2e8f0',
              backgroundColor: themeMeta?.background || '#ffffff',
            }}
          >
            {showGrandTotal && totalPosition === 'top' && <GrandTotalsRow />}

            {sortedRows.map((rowIdx, rowIndex) => {
              const isEven = rowIndex % 2 === 0;
              return (
                <tr
                  key={rowIdx}
                  className={`pivot-row-${(stripeRows && isEven) ? 'even' : 'odd'} ${hoverHighlight ? 'hover:bg-black/[0.03]' : ''} transition-colors group`}
                >
                  {visibleDimensions.map((d, colIdx) => {
                    const cellVal = String(d.data?.[rowIdx] ?? '');
                    const isSelected = selectedCells.get(d.name)?.has(cellVal);
                    return (
                      <td
                        key={`dim-val-${colIdx}`}
                        className={`px-3 py-1.5 font-bold whitespace-nowrap border-r cursor-pointer transition-colors ${isSelected ? 'pivot-cell--selected' : ''}`}
                        style={{
                          color: themeMeta?.text || '#1e293b',
                          borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                        }}
                        onClick={(e) => handleCellClick(e, d.name, cellVal)}
                        onContextMenu={(e) => onDrillContextMenu?.(e, cellVal, d.name)}
                      >
                        {cellVal || '-'}
                      </td>
                    );
                  })}
                  {showDimensionCol && (
                    <td
                      className={`px-3 py-1.5 font-bold whitespace-nowrap border-r cursor-pointer transition-colors ${selectedCells.get('Dimension')?.has(String(categories?.[rowIdx] ?? '')) ? 'pivot-cell--selected' : ''}`}
                      style={{
                        color: themeMeta?.text || '#1e293b',
                        borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                      }}
                      onClick={(e) => handleCellClick(e, 'Dimension', String(categories?.[rowIdx] ?? ''))}
                      onContextMenu={(e) => onDrillContextMenu?.(e, String(categories?.[rowIdx] ?? ''), 'Dimension')}
                    >
                      {categories?.[rowIdx] ?? '-'}
                    </td>
                  )}
                  {visibleSeries.map((s, colIdx) => {
                    const val = s.data?.[rowIdx];
                    const isNull = val === null || val === undefined;

                    // Compute mini-bar percentage
                    const maxVal = columnMaxValues[s.name] || 1;
                    const pct = maxVal > 0 ? Math.min(100, Math.max(0, (Number(val) / maxVal) * 100)) : 0;

                    return (
                      <td
                        key={`ser-val-${colIdx}`}
                        onMouseEnter={() => setHoveredColKey(s.name)}
                        onMouseLeave={() => setHoveredColKey(null)}
                        className={`px-3 py-1.5 tabular-nums text-right border-r last:border-r-0 transition-colors relative ${hoveredColKey === s.name ? 'pivot-col-hover' : ''}`}
                        style={{
                          color: themeMeta?.text || '#1e293b',
                          borderColor: themeMeta?.border || borderColor || '#e2e8f0',
                          backgroundColor: isNull ? undefined : getColorForValue(val),
                        }}
                      >
                        <span className="relative z-10">{formatValue(val)}</span>

                        {/* Mini Bar Visualizer */}
                        {showMiniBar && typeof val === 'number' && (
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

            {showGrandTotal && totalPosition === 'bottom' && <GrandTotalsRow />}
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
    </div>
  );
};

export default DataTableChart;
