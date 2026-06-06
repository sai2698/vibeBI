#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 172 (0-indexed: 171) which has "// Default (Bar, Line, Area, etc.)"
# and insert dataTable/pivotTable handling before it

insert_idx = 171  # Line 172 (0-indexed)

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

# Insert the new code
new_lines = lines[:insert_idx] + [table_handling] + lines[insert_idx:]

with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Inserted dataTable/pivotTable handling at line {insert_idx+1}")
print(f"New total lines: {len(new_lines)}")
