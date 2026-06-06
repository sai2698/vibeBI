#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the second occurrence of the comment
comment = "// Render React-based chart components (not ECharts)"
parts = content.split(comment)

if len(parts) >= 3:
    # Keep first occurrence and everything after second occurrence's end
    # Find where the second block ends (before "return (")
    second_part = parts[2]
    
    # Find the end of pivotTable block - look for the pattern before final return
    end_marker = """  }

  return (
    <div
      ref={containerRef}"""
    
    # Find the second occurrence of this pattern
    if end_marker in second_part:
        # Remove everything from "if (chartType === 'dataTable')" to just before "return ("
        start_remove = "  if (chartType === 'dataTable') {"
        idx = second_part.find(start_remove)
        if idx != -1:
            # Find the end marker in second_part
            end_idx = second_part.find(end_marker)
            if end_idx != -1:
                # Remove from start_remove to end_marker
                removed = second_part[idx:end_idx]
                new_second_part = second_part[:idx] + second_part[end_idx:]
                new_content = parts[0] + comment + parts[1] + comment + new_second_part
                
                with open('/home/naveen/NAVYA/frontend/src/components/charts/EChartWrapper.tsx', 'w', encoding='utf-8', newline='\n') as f:
                    f.write(new_content)
                
                print(f"Removed {len(removed.split(chr(10)))} lines")
            else:
                print("Could not find end marker")
        else:
            print("Could not find start marker in second occurrence")
    else:
        print("End marker not found")
else:
    print(f"Expected 2+ occurrences of comment, found {len(parts)-1}")
