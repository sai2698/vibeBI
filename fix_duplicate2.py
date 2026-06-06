#!/usr/bin/env python3

# Read the file
with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the second occurrence of the dataTable/pivotTable block
# First, find all occurrences
comment = "// DataTable & PivotTable - use the same format as default but ensure dimensions are properly structured"
parts = content.split(comment)

print(f"Found {len(parts)-1} occurrences of the comment")

if len(parts) >= 3:
    # Keep the first occurrence, remove the second one
    # The second occurrence starts at parts[2]
    second_part = parts[2]
    
    # Find the end of the second block (the closing });)
    end_marker = """  }

  // Default (Bar, Line, Area, etc.)"""
    
    if end_marker in second_part:
        # Find where the second block starts (the if statement)
        start_marker = "  if (chartType === 'dataTable' || chartType === 'pivotTable') {"
        start_idx = second_part.find(start_marker)
        
        if start_idx != -1:
            # Find the end marker
            end_idx = second_part.find(end_marker)
            
            if end_idx != -1:
                # Remove from start_marker to end_marker
                removed = second_part[start_idx:end_idx]
                new_second_part = second_part[:start_idx] + second_part[end_idx:]
                
                # Reconstruct the content
                new_content = parts[0] + comment + parts[1] + comment + new_second_part
                
                with open('/home/naveen/NAVYA/frontend/src/utils/chartUtils.ts', 'w', encoding='utf-8', newline='\n') as f:
                    f.write(new_content)
                
                print(f"Removed second duplicate block")
                print(f"Removed {len(removed.split(chr(10)))} lines")
            else:
                print("Could not find end marker")
        else:
            print("Could not find start marker")
    else:
        print("End marker not found")
else:
    print("Expected 2+ occurrences, found", len(parts)-1)
