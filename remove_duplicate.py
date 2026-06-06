#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Remove the second duplicate block (lines 173-197, 0-indexed: 172-196)
# Keep lines 0-172 and 197+

start_idx = 172  # Line 173 (0-indexed)
end_idx = 196    # Line 197 (0-indexed)

print(f"Removing lines {start_idx+1} to {end_idx+1}")

new_lines = lines[:start_idx] + lines[end_idx+1:]

with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Removed {end_idx - start_idx + 1} lines. New total: {len(new_lines)}")
