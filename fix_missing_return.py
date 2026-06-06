#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 701 (0-indexed: 700) which has just "}"
# and insert the missing return statement before line 702 (0-indexed: 701) which has "theme={..."

insert_idx = 701  # Line 702 (0-indexed) - where "theme={" is

missing_content = """  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        containerType: 'size',
      }}
    >
      {!hideHeader && title && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: (visualConfig?.headerBackgroundColor as any) || 'transparent',
            borderBottom: visualConfig?.headerBorderBottom || '1px solid #e2e8f0',
          }}
        >
          <h3 style={{
            margin: 0,
            fontSize: `${visualConfig?.headerFontSize || 14}px`,
            fontWeight: (visualConfig?.headerFontWeight as any) || 600,
            fontFamily: (visualConfig?.headerFontFamily as any) || 'inherit',
            color: themeMeta?.heading || '#1e293b',
          }}>
            {title}
          </h3>
        </div>
      )}
      <div className="flex-1 w-full flex items-center justify-center min-h-0">
        <ReactECharts
          option={mergedOption}
          style={{ height: '100%', width: '100%' }}
"""

# Insert the missing content
new_lines = lines[:insert_idx] + [missing_content] + lines[insert_idx:]

with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Inserted missing content at line {insert_idx+1}")
print(f"New total lines: {len(new_lines)}")
