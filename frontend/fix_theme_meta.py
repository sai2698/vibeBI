import re

with open('src/features/dashboards/DashboardViewPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the lines containing the complex themeMeta extraction
new_lines = []
i = 0
count = 0
while i < len(lines):
    line = lines[i]
    # Check if this is the start of complex themeMeta
    if 'themeMeta: (() => {' in line and count < 2:
        # Skip until we find the closing })()
        indent = '                          '
        new_lines.append(f'{indent}themeMeta: extractThemeMeta(displayDashboard?.echarts_theme, dbThemes || [], {{\n')
        new_lines.append(f'{indent}  background_color: displayDashboard?.background_color,\n')
        new_lines.append(f'{indent}  text_color: displayDashboard?.text_color\n')
        new_lines.append(f'{indent}}})\n')
        # Skip lines until we find the closing })()
        while i < len(lines) and '})()' not in lines[i]:
            i += 1
        i += 1  # Skip the })() line
        count += 1
        continue
    new_lines.append(line)
    i += 1

print(f'Replaced {count} occurrences')

with open('src/features/dashboards/DashboardViewPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('File updated successfully')
