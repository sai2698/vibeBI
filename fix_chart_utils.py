#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the KPI section and update it to handle backend column names
old_kpi = """  // KPI
  if (chartType === 'kpi') {
    const firstMet = metrics[0];
    const mDisplay = firstMet ? getDisplayName(firstMet) : 'Value';
    const value = metrics.length > 0
      ? resData.reduce((sum: number, row: any) => sum + (Number(row[mDisplay]) || 0), 0)
      : 0;
    return {
      series: [{ name: mDisplay, value }]
    };
  }"""

new_kpi = """  // KPI
  if (chartType === 'kpi') {
    const firstMet = metrics[0];
    const mDisplay = firstMet ? getDisplayName(firstMet) : 'Value';
    
    // Try to find the value from the first row using the metric name
    // Backend might return column names like "count_INTEGRATION_ID" or "sum_column"
    let value = 0;
    if (resData.length > 0) {
      const firstRow = resData[0];
      // Try the display name first
      if (firstRow[mDisplay] !== undefined) {
        value = Number(firstRow[mDisplay]) || 0;
      } else {
        // Fallback: try to find any numeric value in the row
        const numericValue = Object.values(firstRow).find(v => typeof v === 'number');
        if (numericValue !== undefined) {
          value = numericValue;
        }
      }
    }
    
    return {
      series: [{ name: mDisplay, value }]
    };
  }"""

content = content.replace(old_kpi, new_kpi)

# Add special handling for dataTable and pivotTable before the default case
# Find the "Default (Bar, Line, Area, etc.)" comment
default_start = content.find("  // Default (Bar, Line, Area, etc.)")

if default_start != -1:
    # Insert dataTable and pivotTable handling before the default case
    table_handling = """  // DataTable & PivotTable - use the same format as default but ensure dimensions are properly structured
  if (chartType === 'dataTable' || chartType === 'pivotTable') {
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

"""
    
    # Insert the new code before the default case
    content = content[:default_start] + table_handling + content[default_start:]

with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Updated chartUtils.ts with fixes for KPI, dataTable, and pivotTable")
