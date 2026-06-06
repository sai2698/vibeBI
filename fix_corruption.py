#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find and remove the corrupted partial block at lines 172-175 (0-indexed: 171-174)
# Lines 172-175 contain:
#   // DataTable & PivotTable...
#     };
#   }
#
# We need to remove these 4 lines

start_idx = 171  # Line 172 (0-indexed)
end_idx = 174    # Line 175 (0-indexed)

print(f"Removing corrupted lines {start_idx+1} to {end_idx+1}")

new_lines = lines[:start_idx] + lines[end_idx+1:]

with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Removed {end_idx - start_idx + 1} lines. New total: {len(new_lines)}")
