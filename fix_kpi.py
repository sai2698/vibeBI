#!/usr/bin/env python3
import sys

# Read the file
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace lines 214-216 (0-indexed: 213-215)
new_lines = lines[:213]  # Lines before 214

# New content for lines 214-216
new_content = """  const cfg = visualConfig;
  
  // Extract value from various data formats
  let value: number | string = 0;
  let label = 'Metric';
  
  // Priority 1: series[0].value (standard format)
  if (series[0]?.value !== undefined) {
    value = series[0].value;
    label = series[0].name || 'Metric';
  }
  // Priority 2: series[0].data[0] (array format)
  else if (series[0]?.data?.[0] !== undefined) {
    value = series[0].data[0];
    label = series[0].name || 'Metric';
  }
  // Priority 3: dimensions[0].data[0] (dimension format - backend format)
  else if (dimensions?.[0]?.data?.[0] !== undefined) {
    value = dimensions[0].data[0];
    label = dimensions[0].name || 'Metric';
  }
  
  const isPositive = value >= (getConfigValue(cfg, 'kpi.trendThreshold') ?? 0);
"""

# Add new content
new_lines.append(new_content)

# Add remaining lines after 216
new_lines.extend(lines[216:])

# Write back
with open(sys.argv[1], 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print("File updated successfully")
