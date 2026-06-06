#!/usr/bin/env python3
import sys

# Read the file
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the second dataTable block (around line 703, 0-indexed: 702)
# and remove from line 703 to line 792 (0-indexed: 702 to 791)
# Keep lines 0-702 and 792+

# Actually, let's be more precise - find the exact start and end
start_line = None
end_line = None

for i, line in enumerate(lines):
    if i > 600 and "if (chartType === 'dataTable') {" in line:
        start_line = i
        break

if start_line is not None:
    # Find the end - look for "return (" after the pivotTable block
    for i in range(start_line, min(start_line + 100, len(lines))):
        if i > start_line and lines[i].strip() == 'return (' and 'div' in lines[i+1]:
            end_line = i
            break

if start_line and end_line:
    # Remove lines from start_line to end_line-1 (inclusive)
    new_lines = lines[:start_line] + lines[end_line:]
    
    # Write back
    with open(sys.argv[1], 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(new_lines)
    
    print(f"Removed duplicate blocks from line {start_line+1} to {end_line}")
else:
    print(f"Could not find exact boundaries. start={start_line}, end={end_line}")
