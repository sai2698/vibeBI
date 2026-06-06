
export interface ChartData {
  categories?: string[];
  xAxisCategories?: string[];   // Used by heatmap for X-axis labels
  dimensions?: Array<{ name: string; data: any[] }>;
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
}

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
        name: dimensions.map(d => String(row[getName(d)] ?? '')).join(' - ') || 'Total',
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

    if (rowDimNames.length > 0 && metrics.length > 0) {
      const mDisplay = getDisplayName(metrics[0]);

      // 1. Identify unique rows
      const rowMap = new Map<string, any[]>();
      resData.forEach(row => {
          const key = rowDimNames.map(d => String(row[d] ?? '')).join('|||');
          if (!rowMap.has(key)) {
              rowMap.set(key, rowDimNames.map(d => row[d]));
          }
      });
      const uniqueRowKeys = Array.from(rowMap.keys());

      // 2. Identify unique column combinations
      const uniqueCols = Array.from(new Set(resData.map(row => 
          colDimNames.map(d => String(row[d] ?? '')).join(' - ')
      ))).filter(c => c !== "");
      
      if (uniqueCols.length === 0) uniqueCols.push("Total");

      // 3. Build lookup table
      const lookup: Record<string, Record<string, any>> = {};
      uniqueCols.forEach(c => lookup[c] = {});
      
      resData.forEach(row => {
          const rKey = rowDimNames.map(d => String(row[d] ?? '')).join('|||');
          const cKey = colDimNames.map(d => String(row[d] ?? '')).join(' - ') || "Total";
          lookup[cKey][rKey] = row[mDisplay];
      });

      // 4. Build Result
      const pivotSeries = uniqueCols.map(c => ({
        name: c,
        data: uniqueRowKeys.map(r => lookup[c][r] ?? null)
      }));

      const dimensionData = rowDimNames.map((name, i) => ({
          name,
          data: uniqueRowKeys.map(r => rowMap.get(r)![i])
      }));

      return {
        categories: uniqueRowKeys,
        series: pivotSeries,
        dimensions: dimensionData
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
      dimensions.map(d => String(row[getDisplayName(d)] ?? '')).join(' - ')
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
    dimensions.map(d => String(row[getDisplayName(d)] ?? '')).join(' - ')
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
