#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section with mergedOption and the React component blocks
# We need to move the React component blocks BEFORE mergedOption

# Extract the React component blocks (dataTable, pivotTable, kpi)
react_blocks_start = content.find("  // Render React-based chart components (not ECharts)\n  if (chartType === 'dataTable') {")
if react_blocks_start == -1:
    print("Could not find React component blocks")
    exit(1)

# Find where the kpi block ends (before the "no data" check)
kpi_block_end = content.find("\n  if (!data || !data.series || data.series.length === 0) {")
if kpi_block_end == -1:
    print("Could not find 'no data' check")
    exit(1)

# Extract the React component blocks
react_blocks = content[react_blocks_start:kpi_block_end]

# Find the mergedOption block
merged_option_start = content.find("  const mergedOption = useMemo(() => {")
if merged_option_start == -1:
    print("Could not find mergedOption")
    exit(1)

# Find where mergedOption ends (the closing });)
merged_option_end = content.find("  }, [chartType, data, title, visualConfig, theme, themeMeta]);", merged_option_start)
if merged_option_end == -1:
    print("Could not find mergedOption end")
    exit(1)
merged_option_end += len("  }, [chartType, data, title, visualConfig, theme, themeMeta]);")

# Check if there's a newline after mergedOption
if merged_option_end < len(content) and content[merged_option_end] == '\n':
    merged_option_end += 1

# Remove the React component blocks from their current position
content_before_react = content[:react_blocks_start]
content_after_react = content[kpi_block_end:]

# Remove the React blocks from the middle
content_without_react = content_before_react + content_after_react

# Now insert the React blocks BEFORE mergedOption
final_content = content_without_react[:merged_option_start] + "\n" + react_blocks + "\n" + content_without_react[merged_option_start:]

with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(final_content)

print("Moved React component blocks before mergedOption")
