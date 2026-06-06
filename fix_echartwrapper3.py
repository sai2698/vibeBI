#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find line 703 (0-indexed: 702) which has "  if (chartType === 'dataTable') {"
# and remove until we find the closing "  }" before "  return ("

start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if i >= 700 and "if (chartType === 'dataTable') {" in line:
        start_idx = i
        print(f"Found second dataTable block at line {i+1}")
        break

if start_idx:
    # Find the closing brace of pivotTable block
    # Look for pattern: "  }\n\n  return ("
    for i in range(start_idx, min(start_idx + 120, len(lines))):
        if lines[i].strip() == '}' and i+1 < len(lines) and lines[i+1].strip() == '' and i+2 < len(lines) and 'return (' in lines[i+2]:
            end_idx = i
            print(f"Found end at line {i+1}")
            break

if start_idx and end_idx:
    # Remove from start_idx to end_idx (inclusive)
    new_lines = lines[:start_idx] + lines[end_idx+1:]
    
    with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(new_lines)
    
    print(f"Removed lines {start_idx+1} to {end_idx+1} ({end_idx - start_idx + 1} lines)")
else:
    print(f"Could not find boundaries: start={start_idx}, end={end_idx}")
