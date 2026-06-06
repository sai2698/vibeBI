#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Remove lines 702-786 (0-indexed: 701-785)
# This removes the second set of React component blocks (duplicate dataTable and pivotTable)
# Keep lines 0-701 and 786+

start_idx = 701  # Line 702 (0-indexed) - "// Render React-based chart components"
end_idx = 785    # Line 786 (0-indexed) - closing brace of duplicate pivotTable

print(f"Removing lines {start_idx+1} to {end_idx+1}")

new_lines = lines[:start_idx] + lines[end_idx+1:]

with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Removed {end_idx - start_idx + 1} lines. New total: {len(new_lines)}")
