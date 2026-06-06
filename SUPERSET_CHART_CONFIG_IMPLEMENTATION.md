# Superset-Style Chart Configuration Implementation

## Overview
I've implemented a comprehensive Superset-style chart configuration system for your chart builder, providing advanced customization options similar to Apache Superset's frontend.

## What Was Created

### 1. New Component: `SupersetChartControls.tsx`
**Location**: `frontend/src/features/charts/components/SupersetChartControls.tsx`

This component provides a complete configuration panel with the following sections:

#### X-Axis Configuration
- Axis label customization
- Label rotation (0°, 30°, 45°, 60°, 90°)
- Number format selection (D3 formats)
- Scale type (linear/logarithmic)
- Show/hide axis
- Truncate axis option

#### Y-Axis Configuration
- Axis label customization
- Number format selection (D3 formats)
- Scale type (linear/logarithmic)
- Show/hide axis
- Truncate axis option

#### Legend Configuration
- Show/hide legend
- Orientation (horizontal/vertical)
- Position (top/bottom/left/right/inside)
- Sort options (label_asc, label_desc, data_asc, data_desc)

#### Data Labels Configuration
- Show/hide labels
- Position (inside/outside/top/bottom/left/right)
- Number format selection
- Show zero values option

#### Bar Chart Specific Options
- Orientation (vertical/horizontal)
- Stacking (normal/percent/none)
- Bar width control

#### Line Chart Specific Options
- Smooth curves toggle
- Show points toggle
- Area fill toggle
- Area opacity control

#### Pie/Donut Chart Options
- Donut style toggle
- Outer radius slider (30-90%)
- Inner radius slider (10-60%)

#### Sorting Configuration
- Sort by options (label/data, asc/desc)
- Custom order support

#### Tooltip Configuration
- Show/hide tooltip
- Trigger type (item/axis)

### 2. Type Definitions
The component exports a comprehensive TypeScript interface:

```typescript
interface SupersetVisualConfig {
  x_axis?: { title, show, labelRotation, format, bounds, truncate, scale };
  y_axis?: { title, show, format, bounds, truncate, scale };
  legend?: { show, orientation, position, type, sortBy };
  dataLabels?: { show, position, format, showZero };
  bar?: { orientation, stacking, groupBy, barWidth };
  line?: { smooth, showPoints, pointSize, areaFill, areaOpacity };
  pie?: { donut, innerRadius, outerRadius, roseType };
  sorting?: { sortBy, customOrder };
  tooltip?: { show, format, rich, trigger };
  numberFormat?: string;
  currencyFormat?: string;
  dateFormat?: string;
  showLegend?: boolean;
  showLabels?: boolean;
  stacked?: boolean;
  smoothCurves?: boolean;
  colorPalette?: string[];
  backgroundColor?: string;
}
```

### 3. Format Options
The component includes comprehensive format options:

#### D3 Number Formats
- Adaptive Formatting
- Default (~g)
- Comma (,)
- Percent (.0%, .2%)
- Currency ($,.0f, $,.2f)
- Scientific (.2e)
- Exponential (.2s)
- Integer (d)
- Fixed (.2f, .3f, .4f)

#### D3 Time Formats
- Adaptive Formatting
- Smart Date (smart_date)
- %Y-%m-%d
- %Y-%m-%d %H:%M
- %Y-%m-%d %H:%M:%S
- %d %b %Y
- %d %B %Y
- %B %Y
- %m/%d/%Y
- %H:%M:%S
- %H:%M

## Integration Instructions

### Step 1: Import the Component
The import has already been added to `ChartBuilderPage.tsx`:
```typescript
import SupersetChartControls, { SupersetVisualConfig } from './components/SupersetChartControls';
```

### Step 2: Update State Type
The state has already been updated:
```typescript
const [visualConfig, setVisualConfig] = useState<SupersetVisualConfig>({});
```

### Step 3: Replace the Right Sidebar
You need to replace the existing right sidebar (Visual Style section) in `ChartBuilderPage.tsx` with the new SupersetChartControls component.

**Find this section** (approximately line 900-1150):
```tsx
{/* Right Sidebar: Styles */}
<div className="shrink-0 w-72 bg-slate-50 dark:bg-[#0f1115] border-l ...">
  ...
</div>
```

**Replace it with**:
```tsx
{/* Right Sidebar: Styles */}
<div className="shrink-0 w-80 bg-slate-50 dark:bg-[#0f1115] border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1b1e]">
    <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Chart Configuration</h3>
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-white dark:bg-[#0f1115]">
    <SupersetChartControls
      config={visualConfig}
      onChange={setVisualConfig}
      chartType={chartType}
    />

    {/* Color Palette Section */}
    <div className="h-px bg-slate-200 dark:bg-slate-800" />
    
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette size={14} className="text-brand" />
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Color Palette</label>
      </div>
      <div className="flex flex-col gap-2">
        {Object.keys(PALETTES).map(p => (
          <button
            key={p}
            onClick={() => setSelectedPalette(p as any)}
            className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between ${selectedPalette === p 
              ? 'border-brand ring-4 ring-brand/10 bg-white dark:bg-[#1e1e1e] shadow-sm' 
              : 'border-slate-200 dark:border-slate-800 hover:border-brand/40 bg-white dark:bg-[#1a1b1e]'
            }`}>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{p}</span>
            <div className="flex gap-1">
              {PALETTES[p as keyof typeof PALETTES].slice(0, 5).map((c, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-full shadow-sm border border-white/20" style={{ backgroundColor: c }} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className="h-px bg-slate-200 dark:bg-slate-800" />

    {/* Quick Style Overrides for Backward Compatibility */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-slate-400" />
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Styles</label>
      </div>
      
      <div className="space-y-3 p-3 bg-white dark:bg-[#1a1b1e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Background Color</span>
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-[#0f1115] rounded-lg border border-slate-100 dark:border-slate-700">
            <input
              type="color"
              value={visualConfig.backgroundColor || '#ffffff'}
              onChange={e => setVisualConfig((v: any) => ({ ...v, backgroundColor: e.target.value }))}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
            />
            <span className="text-[11px] font-mono font-semibold text-slate-400">{visualConfig.backgroundColor || '#ffffff'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Chart Title Font Size</span>
          <input
            type="number"
            value={visualConfig.headerFontSize || 14}
            onChange={e => setVisualConfig((v: any) => ({ ...v, headerFontSize: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0f1115] border border-slate-100 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 transition-all dark:text-slate-100"
          />
        </div>
      </div>
    </div>
  </div>
</div>
```

### Step 4: Add Missing Icon Import
Add `Settings2` to the lucide-react imports:
```typescript
import {
  ...
  Settings2,
  ...
} from 'lucide-react';
```

## Features Comparison

### Before (Old System)
- Basic checkboxes for showLegend, showLabels, smoothCurves, stacked
- Simple text inputs for axis labels
- Limited color palette selection
- No format options
- No sorting options
- No chart-type-specific controls

### After (Superset-Style System)
- ✅ Comprehensive X-Axis & Y-Axis configuration
- ✅ Advanced legend customization (position, orientation, sorting)
- ✅ Data labels with position and format options
- ✅ Chart-type-specific controls (bar, line, pie)
- ✅ D3 number and time format support
- ✅ Sorting configuration
- ✅ Tooltip customization
- ✅ Scale type selection (linear/log)
- ✅ Axis bounds and truncation options
- ✅ Backward compatibility with existing visual_config fields

## Usage Example

```typescript
// In your chart configuration
const visualConfig: SupersetVisualConfig = {
  x_axis: {
    title: 'Category',
    labelRotation: 45,
    format: ',.0f',
    scale: 'linear'
  },
  y_axis: {
    title: 'Revenue',
    format: '$,.0f',
    scale: 'linear'
  },
  legend: {
    show: true,
    orientation: 'horizontal',
    position: 'bottom',
    sortBy: 'data_desc'
  },
  dataLabels: {
    show: true,
    position: 'outside',
    format: '.2%'
  },
  bar: {
    orientation: 'vertical',
    stacking: 'normal'
  },
  sorting: {
    sortBy: 'data_desc'
  }
};
```

## Next Steps

1. **Update EChartWrapper**: Ensure your EChartWrapper component reads the new nested config structure (e.g., `visualConfig.x_axis.title` instead of `visualConfig.xAxisTitle`)

2. **Migration Path**: The old fields (xAxisTitle, yAxisTitle, etc.) are still supported for backward compatibility

3. **Testing**: Test each chart type to ensure the new configuration options work correctly

4. **Backend Updates**: If needed, update your backend schema to support the new nested configuration structure

## Benefits

1. **Professional UI**: Matches Apache Superset's professional chart configuration interface
2. **Comprehensive Options**: Provides all the customization options data analysts expect
3. **Type Safety**: Full TypeScript support with comprehensive interfaces
4. **Extensible**: Easy to add more configuration options in the future
5. **Chart-Type Aware**: Shows relevant options based on selected chart type
6. **D3 Format Support**: Industry-standard number and date formatting

## References

- Apache Superset Frontend: https://github.com/apache/superset/tree/master/superset-frontend
- D3 Format Documentation: https://github.com/d3/d3-format
- ECharts Documentation: https://echarts.apache.org/en/option.html
