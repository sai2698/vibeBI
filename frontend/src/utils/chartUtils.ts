
export interface ChartData {
  categories?: string[];
  xAxisCategories?: string[];   // Used by heatmap for X-axis labels
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  pivotData?: any; // Rich structured data for pivot table
}

/**
 * Convert a raw dimension value to a safe category string.
 * null/undefined → '__NULL__', empty string → '__EMPTY__', otherwise String(v).
 * This ensures drill-down and filter operations send the correct sentinel
 * back to the backend for proper SQL generation (IS NULL / = '').
 */
export const toSafeCategoryValue = (v: any): string => {
  if (v === null || v === undefined) return '__NULL__';
  const s = String(v);
  if (s.trim() === '') return '__EMPTY__';
  return s;
};

/**
 * Convert sentinel values to user-friendly display labels for chart axes.
 */
export const displayCategoryValue = (v: string): string => {
  if (v === '__NULL__') return '(No Value)';
  if (v === '__EMPTY__') return '(Empty)';
  return v;
};

/**
 * Convert user-friendly display labels back to sentinel values.
 */
export const toSentinelValue = (v: any): any => {
  if (Array.isArray(v)) {
    return v.map(toSentinelValue);
  }
  const s = String(v);
  if (s === '(No Value)') return '__NULL__';
  if (s === '(Empty)') return '__EMPTY__';
  return v;
};

export const transformChartData = (
  resData: any[],
  chartType: string,
  dimensions: any[], 
  metrics: any[],
  pivotColumns: any[] = []
): ChartData => {
  if (!resData || resData.length === 0) return { series: [] };

  // Helpers to handle object-based or string-based config
  const getName = (item: any) => typeof item === 'string' ? item : item.name;
  const getDisplayName = (item: any) => {
    if (typeof item === 'string') return item;
    return item.alias || item.name;
  };

  // ── Heatmap ──
  // Produces [x, y, value] triplets with separate xAxisCategories / yAxisCategories
  if (chartType === 'heatmap') {
    const rowDimNames = dimensions.map(getDisplayName);
    const colDimNames = (pivotColumns || []).map(getDisplayName);

    // Fallback: if no pivotColumns but ≥2 row dims, pop the last one as column dim
    if (colDimNames.length === 0 && rowDimNames.length >= 2) {
      colDimNames.push(rowDimNames.pop()!);
    }

    if (rowDimNames.length > 0 && colDimNames.length > 0 && metrics.length > 0) {
      const mDisplay = getDisplayName(metrics[0]);

      // Y-axis: unique row dimension value combinations
      const yCategories = [...new Set(resData.map(row =>
        rowDimNames.map(d => String(row[d] ?? '')).join(' - ')
      ))];

      // X-axis: unique column dimension value combinations
      const xCategories = [...new Set(resData.map(row =>
        colDimNames.map(d => String(row[d] ?? '')).join(' - ')
      ))];

      // Build [xIndex, yIndex, value] triplets
      const heatmapData: [number, number, number][] = [];
      resData.forEach(row => {
        const yKey = rowDimNames.map(d => String(row[d] ?? '')).join(' - ');
        const xKey = colDimNames.map(d => String(row[d] ?? '')).join(' - ');
        const xIdx = xCategories.indexOf(xKey);
        const yIdx = yCategories.indexOf(yKey);
        const val = Number(row[mDisplay]) || 0;
        if (xIdx >= 0 && yIdx >= 0) {
          heatmapData.push([xIdx, yIdx, val]);
        }
      });

      return {
        categories: yCategories,           // Y-axis labels
        xAxisCategories: xCategories,      // X-axis labels
        series: [{ name: mDisplay, data: heatmapData }],
      };
    }

    // Insufficient config fallback
    return { series: [] };
  }

  // ── Pie, Donut, Funnel, Treemap, Sunburst ──
  if (['pie', 'donut', 'funnel', 'treemap', 'sunburst'].includes(chartType)) {
    const firstMet = metrics[0];
    const mDisplay = firstMet ? getDisplayName(firstMet) : null;

    return {
      series: resData.map((row: any) => ({
        name: dimensions.map(d => toSafeCategoryValue(row[getName(d)])).join(' - ') || 'Total',
        value: mDisplay ? row[mDisplay] : 0
      }))
    };
  }

  // ── KPI ──
  if (chartType === 'kpi') {
    const firstMet = metrics[0];
    const mDisplay = firstMet ? getDisplayName(firstMet) : 'Value';
    
    let value = 0;
    if (resData.length > 0) {
      const firstRow = resData[0];
      
      if (firstRow[mDisplay] !== undefined) {
        value = Number(firstRow[mDisplay]) || 0;
      } else {
        const numericValue = Object.values(firstRow).find(v => typeof v === 'number');
        if (numericValue !== undefined) {
          value = numericValue;
        }
      }
    }
    
    return {
      series: [{ name: mDisplay, value }]
    };
  }

  // ── Pivot ──
  if (chartType === 'pivot') {
    const rowDimNames = dimensions.map(getDisplayName);
    const colDimNames = (pivotColumns || []).map(getDisplayName);
    const metricNames = metrics.map(getDisplayName);

    if (rowDimNames.length > 0 && metricNames.length > 0) {
      // 1. Identify unique rows
      const rowMap = new Map<string, any[]>();
      resData.forEach(row => {
          const key = rowDimNames.map(d => String(row[d] ?? '')).join('|||');
          if (!rowMap.has(key)) {
              rowMap.set(key, rowDimNames.map(d => row[d]));
          }
      });
      const uniqueRowKeys = Array.from(rowMap.keys());

      // 2. Identify unique column combinations of colDimNames
      let uniqueColCombs: string[][] = [];
      if (colDimNames.length > 0) {
        const colCombsSet = new Set<string>();
        resData.forEach(row => {
          const path = colDimNames.map(d => String(row[d] ?? ''));
          colCombsSet.add(JSON.stringify(path));
        });
        uniqueColCombs = Array.from(colCombsSet).map(s => JSON.parse(s));
        // Sort column combinations for clean display
        uniqueColCombs.sort((a, b) => {
          for (let i = 0; i < a.length; i++) {
            const cmp = a[i].localeCompare(b[i], undefined, { numeric: true, sensitivity: 'base' });
            if (cmp !== 0) return cmp;
          }
          return 0;
        });
      } else {
        uniqueColCombs = [[]]; // fallback when no column dimensions are selected
      }

      // 3. Build a robust cell lookup map: (rowKey, colCombKey, metricName) -> value
      const lookup: Record<string, Record<string, Record<string, any>>> = {};
      
      resData.forEach(row => {
          const rKey = rowDimNames.map(d => String(row[d] ?? '')).join('|||');
          const colCombPath = colDimNames.map(d => String(row[d] ?? ''));
          const cKey = colCombPath.join('|||');
          
          if (!lookup[rKey]) lookup[rKey] = {};
          if (!lookup[rKey][cKey]) lookup[rKey][cKey] = {};
          
          metricNames.forEach(m => {
            lookup[rKey][cKey][m] = row[m];
          });
      });

      // 4. Build leafColumns for the table
      const leafColumns: Array<{ key: string; colValues: string[]; metricName: string }> = [];
      uniqueColCombs.forEach(colVals => {
        metricNames.forEach(m => {
          const key = [...colVals, m].join('|||');
          leafColumns.push({
            key,
            colValues: colVals,
            metricName: m
          });
        });
      });

      // 5. Build series in the legacy format for compatibility, but also embed the rich pivotData
      const pivotSeries = leafColumns.map(lc => {
        const cKey = lc.colValues.join('|||');
        return {
          name: lc.colValues.length > 0 ? `${lc.colValues.join(' - ')} - ${lc.metricName}` : lc.metricName,
          data: uniqueRowKeys.map(rKey => lookup[rKey]?.[cKey]?.[lc.metricName] ?? null)
        };
      });

      const dimensionData = rowDimNames.map((name, i) => ({
          name,
          data: uniqueRowKeys.map(r => rowMap.get(r)![i])
      }));

      return {
        categories: uniqueRowKeys,
        series: pivotSeries,
        dimensions: dimensionData,
        pivotData: {
          rowDimensionNames: rowDimNames,
          colDimensionNames: colDimNames,
          measureNames: metricNames,
          leafColumns,
          uniqueRowKeys,
          uniqueColCombs,
          lookup,
          rawMetrics: metrics
        }
      };
    }
  }


  // ── Calendar ──
  if (chartType === 'calendar') {
    const firstMet = metrics[0];
    const mDisplay = firstMet ? getDisplayName(firstMet) : null;
    const dim = getDisplayName(dimensions[0]);
    const calData = resData.map((row: any) => {
      const dateStr = String(row[dim] ?? '').split('T')[0];
      return [dateStr, mDisplay ? row[mDisplay] : 0];
    });
    return {
      series: [{ name: mDisplay || 'Value', data: calData }]
    };
  }

  // ── DataTable & PivotTable — use the same format as default but ensure dimensions are properly structured ──
  if (chartType === 'table') {
    const categories = resData.map((row: any) =>
      dimensions.map(d => toSafeCategoryValue(row[getDisplayName(d)])).join(' - ')
    );

    const series = metrics.map(m => {
      const mDisplay = getDisplayName(m);
      return {
        name: mDisplay,
        data: resData.map((row: any) => row[mDisplay])
      };
    });

    const dimensionData = dimensions.map(d => {
        const dDisplay = getDisplayName(d);
        return {
          name: dDisplay,
          data: resData.map((row: any) => row[dDisplay])
        };
    });

    return {
      categories,
      series,
      dimensions: dimensionData
    };
  }

  // ── Default (Bar, Line, Area, Scatter, etc.) ──
  const categories = resData.map((row: any) =>
    dimensions.map(d => toSafeCategoryValue(row[getDisplayName(d)])).join(' - ')
  );

  const series = metrics.map(m => {
    const mDisplay = getDisplayName(m);
    return {
      name: mDisplay,
      data: resData.map((row: any) => row[mDisplay])
    };
  });

  const dimensionData = dimensions.map(d => {
      const dDisplay = getDisplayName(d);
      return {
        name: dDisplay,
        data: resData.map((row: any) => row[dDisplay])
      };
  });

  return {
    categories,
    series,
    dimensions: dimensionData
  };
};
