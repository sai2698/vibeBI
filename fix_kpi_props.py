#!/usr/bin/env python3
import sys

# Read the file
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the props destructuring
old_text = """export const KPITileChart: React.FC<KPITileChartProps> = ({
  series,
  visualConfig = {},
  themeMeta,
}) => {"""

new_text = """export const KPITileChart: React.FC<KPITileChartProps> = ({
  series,
  dimensions,
  visualConfig = {},
  themeMeta,
}) => {"""

content = content.replace(old_text, new_text)

# Write back
with open(sys.argv[1], 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Props destructuring updated successfully")
