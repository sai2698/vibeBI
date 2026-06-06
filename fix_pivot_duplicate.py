#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 747-786 (0-indexed: 746-785)
# Keep lines 0-746 and 786+

start_idx = 746  # Line 747 (0-indexed)
end_idx = 785    # Line 786 (0-indexed)

print(f"Removing lines {start_idx+1} to {end_idx+1}")

new_lines = lines[:start_idx] + lines[end_idx+1:]

with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Removed {end_idx - start_idx + 1} lines. New total: {len(new_lines)}")
