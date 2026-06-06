#!/usr/bin/env python3
import sys

with open(sys.argv[1], 'r') as f:
    lines = f.readlines()

# Find the line with 'datasource = None' after line 180
insert_idx = None
for i, line in enumerate(lines):
    if 'datasource = None' in line and i > 180:
        insert_idx = i + 1
        break

if insert_idx:
    new_lines = [
        '\n',
        "    # Merge chart's default_filters with incoming request filters\n",
        '    # Request filters (from dashboard) take precedence over chart default filters\n',
        "    merged_filters = dict(chart.query_config.get('default_filters', {}) or {})\n",
        '    if req.filters:\n',
        '        for key, value in req.filters.items():\n',
        "            if value is not None and value != '' and value != []:\n",
        '                merged_filters[key] = value\n',
        '\n'
    ]
    lines[insert_idx:insert_idx] = new_lines
    
    with open(sys.argv[1], 'w') as f:
        f.writelines(lines)
    print('Successfully added merged_filters definition at line', insert_idx)
else:
    print('Could not find insertion point')
    sys.exit(1)
