import React, { useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

type EChartsOption = echarts.EChartsOption;

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
    };
    dataLabels?: {
      fontSize?: number;
      fontFamily?: string;
      headerBackgroundColor?: string;
      headerColor?: string;
      rowColor?: string;
      borderColor?: string;
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
  /** Called when user right-clicks a data cell */
  onDrillContextMenu?: (e: React.MouseEvent, cellValue: string, colName: string) => void;
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
      ],
    },
  ],
  defaultConfig: {
    table: { pageSize: 10, showPagination: true, sortable: true, searchable: true, showRowNumbers: false, stripeRows: true, hoverHighlight: true, includeColumns: '', excludeColumns: '' },
    dataLabels: { fontSize: 14, fontFamily: 'Arial, sans-serif', headerBackgroundColor: '#f1f5f9', headerColor: '#1e293b', rowColor: '#ffffff', borderColor: '#e2e8f0' },
  },
});

export function buildDataTableChartOptions(_props: DataTableChartProps): EChartsOption {
  // This function is kept for compatibility but DataTable is rendered as React component
  return { series: [] };
}

export const DataTableChart: React.FC<DataTableChartProps> = ({
  categories,
  dimensions,
  series,
  visualConfig = {},
  themeMeta,
  onDrillContextMenu,
}) => {
  const cfg = visualConfig;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: '',
    direction: null,
  });

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

  const fontSize = getConfigValue(cfg, 'dataLabels.fontSize') ?? 14;

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
            {visibleDimensions.map((d, i) => (
              <th
                key={`dim-${i}`}
                className="px-3 py-2 font-extrabold uppercase tracking-wider border-r cursor-pointer group hover:bg-black/5 transition-colors"
                style={{
                  color: themeMeta?.text || '#1e293b',
                  borderColor: themeMeta?.border || '#e2e8f0',
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
                  borderColor: themeMeta?.border || '#e2e8f0',
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
                  borderColor: themeMeta?.border || '#e2e8f0',
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
            borderColor: themeMeta?.border || '#e2e8f0',
            backgroundColor: themeMeta?.background || '#ffffff',
          }}
        >
          {sortedRows.map((rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-black/[0.03] transition-colors group"
            >
              {visibleDimensions.map((d, colIdx) => (
                <td
                  key={`dim-val-${colIdx}`}
                  className="px-3 py-1.5 font-bold whitespace-nowrap border-r group-hover:bg-black/[0.02] transition-colors cursor-context-menu"
                  style={{
                    color: themeMeta?.text || '#1e293b',
                    backgroundColor: `${themeMeta?.background || '#ffffff'}cc`,
                    borderColor: themeMeta?.border || '#e2e8f0',
                  }}
                  onContextMenu={(e) => onDrillContextMenu?.(e, String(d.data?.[rowIdx] ?? ''), d.name)}
                >
                  {String(d.data?.[rowIdx] ?? '-')}
                </td>
              ))}
              {showDimensionCol && (
                <td
                  className="px-3 py-1.5 font-bold whitespace-nowrap border-r group-hover:bg-black/[0.02] transition-colors cursor-context-menu"
                  style={{
                    color: themeMeta?.text || '#1e293b',
                    backgroundColor: `${themeMeta?.background || '#ffffff'}cc`,
                    borderColor: themeMeta?.border || '#e2e8f0',
                  }}
                  onContextMenu={(e) => onDrillContextMenu?.(e, String(categories?.[rowIdx] ?? ''), 'Dimension')}
                >
                  {categories?.[rowIdx] ?? '-'}
                </td>
              )}
              {visibleSeries.map((s, colIdx) => {
                const val = s.data?.[rowIdx];
                const isNull = val === null || val === undefined;
                return (
                  <td
                    key={`ser-val-${colIdx}`}
                    className="px-3 py-1.5 tabular-nums text-right border-r last:border-r-0 group-hover:bg-black/[0.01] transition-colors"
                    style={{
                      color: themeMeta?.text || '#1e293b',
                      borderColor: themeMeta?.border || '#e2e8f0',
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTableChart;
