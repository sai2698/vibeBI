# Chart Components Refactoring

## Overview
The EChartWrapper component has been refactored to use a modular architecture where each chart type has its own dedicated builder function in separate files. This improves maintainability, testability, and code organization.

## Structure

```
frontend/src/components/charts/
├── EChartWrapper.tsx              # Main wrapper component (orchestrates chart builders)
├── themes/                        # Theme management
└── types/                         # Individual chart type builders
    ├── index.ts                   # Exports all chart builders
    ├── BarChart.ts                # Bar chart options builder
    ├── LineChart.ts               # Line chart options builder
    ├── AreaChart.ts               # Area chart options builder
    ├── PieChart.ts                # Pie chart options builder
    ├── DonutChart.ts              # Donut chart options builder
    ├── ScatterChart.ts            # Scatter chart options builder
    ├── HeatmapChart.ts            # Heatmap chart options builder
    ├── RadarChart.ts              # Radar chart options builder
    ├── TreemapChart.ts            # Treemap chart options builder
    ├── SunburstChart.ts           # Sunburst chart options builder
    ├── FunnelChart.ts             # Funnel chart options builder
    ├── GaugeChart.ts              # Gauge chart options builder
    └── fix-types.sh               # Utility script for type fixes
```

## Benefits

### 1. **Improved Maintainability**
- Each chart type is isolated in its own file
- Easier to locate and fix chart-specific issues
- Clear separation of concerns

### 2. **Better Testability**
- Individual chart builders can be unit tested independently
- Mock data specific to each chart type
- Isolated regression testing

### 3. **Enhanced Readability**
- Smaller, focused files (100-150 lines each)
- Clear interface definitions
- Consistent structure across all chart types

### 4. **Easier Extensibility**
- Add new chart types by creating a new file
- No need to modify the main EChartWrapper
- Follows Open/Closed Principle

## Chart Builder Interface

Each chart builder follows this pattern:

```typescript
interface [ChartName]Options {
  categories?: string[];
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: {
    // Chart-specific configuration
    showLegend?: boolean;
    showLabels?: boolean;
    // ... other options
  };
}

export function build[ChartName]Options({
  categories,
  series,
  visualConfig,
}: [ChartName]Options): EChartsOption {
  // Build and return ECharts options
}
```

## Usage

### In EChartWrapper.tsx

```typescript
import {
  buildBarChartOptions,
  buildLineChartOptions,
  // ... other builders
} from './types';

function buildOption(chartType: ChartType, data: ChartData, visualConfig?: any) {
  switch (chartType) {
    case 'bar':
      return buildBarChartOptions({
        categories: data.categories,
        series: data.series,
        visualConfig: {
          // Map visualConfig to chart-specific config
          stacking: visualConfig?.bar?.stacking,
          // ... other options
        },
      });
    
    case 'line':
      return buildLineChartOptions({
        // ... similar pattern
      });
    
    // ... other chart types
    
    default:
      // Fallback to basic bar chart
  }
}
```

### Adding a New Chart Type

1. Create a new file in `types/` directory:
```typescript
// types/NewChartType.ts
import type { EChartsOption } from 'echarts';

interface NewChartTypeOptions {
  categories?: string[];
  series: Array<{
    name: string;
    data?: any[];
    value?: number;
  }>;
  visualConfig?: {
    showLegend?: boolean;
    // ... chart-specific options
  };
}

export function buildNewChartTypeOptions({
  categories,
  series,
  visualConfig,
}: NewChartTypeOptions): EChartsOption {
  // Implementation
  return {
    // ECharts options
  };
}
```

2. Export from `types/index.ts`:
```typescript
export { buildNewChartTypeOptions } from './NewChartType';
```

3. Import and use in EChartWrapper.tsx:
```typescript
import { buildNewChartTypeOptions } from './types';

// In buildOption function
case 'newChartType':
  return buildNewChartTypeOptions({
    categories: data.categories,
    series: data.series,
    visualConfig: {
      showLegend: visualConfig?.legend?.show,
      // ... other options
    },
  });
```

## Configuration Mapping

The refactored code maintains backward compatibility with the nested Superset-style configuration:

```typescript
// Nested config from SupersetChartControls
const visualConfig = {
  x_axis: {
    title: "X Axis Title",
    labelRotation: 45,
  },
  legend: {
    show: true,
    orientation: "horizontal",
  },
  bar: {
    stacking: true,
    barWidth: 40,
  },
  // ...
};

// Mapped to flat config for chart builders
const cfg = {
  xAxisTitle: visualConfig?.x_axis?.title,
  xAxisRotation: visualConfig?.x_axis?.labelRotation,
  showLegend: visualConfig?.legend?.show,
  stacking: visualConfig?.bar?.stacking,
  // ...
};
```

## Supported Chart Types

### Primary Charts (Full Support)
- ✅ Bar Chart (with stacking)
- ✅ Line Chart (with smooth curves, area fill)
- ✅ Area Chart (with stacking)
- ✅ Pie Chart
- ✅ Donut Chart
- ✅ Scatter Chart
- ✅ Heatmap Chart
- ✅ Radar Chart

### Advanced Charts (Basic Support)
- 🟡 Treemap Chart
- 🟡 Sunburst Chart
- 🟡 Funnel Chart
- 🟡 Gauge Chart
- 🟡 Boxplot Chart
- 🟡 Graph Chart
- 🟡 Sankey Chart
- 🟡 Parallel Chart
- 🟡 Pictorial Bar Chart
- 🟡 Theme River Chart
- 🟡 Calendar Chart

## Testing

### Unit Testing Example

```typescript
// __tests__/BarChart.test.ts
import { buildBarChartOptions } from '../types/BarChart';

describe('buildBarChartOptions', () => {
  it('should create basic bar chart options', () => {
    const options = buildBarChartOptions({
      categories: ['A', 'B', 'C'],
      series: [
        { name: 'Series 1', data: [10, 20, 30] }
      ],
      visualConfig: {
        showLegend: true,
        stacking: false,
      },
    });
    
    expect(options.xAxis).toBeDefined();
    expect(options.series).toHaveLength(1);
    expect(options.series[0].type).toBe('bar');
  });
  
  it('should enable stacking when configured', () => {
    const options = buildBarChartOptions({
      categories: ['A', 'B', 'C'],
      series: [
        { name: 'Series 1', data: [10, 20, 30] },
        { name: 'Series 2', data: [15, 25, 35] }
      ],
      visualConfig: {
        stacking: true,
      },
    });
    
    expect(options.series[0].stack).toBe('total');
    expect(options.series[1].stack).toBe('total');
  });
});
```

## Migration Notes

### Backward Compatibility
✅ All existing chart configurations continue to work
✅ Nested Superset-style config is properly mapped
✅ No breaking changes to the public API

### Deprecation
- The old monolithic `buildOption` switch statement has been refactored
- Individual chart logic is now in separate files
- No changes required in consuming components

## Performance Considerations

- Chart builders are pure functions (no side effects)
- Results are memoized in EChartWrapper via `useMemo`
- No performance degradation from refactoring
- Potential for lazy loading of chart builders in future

## Future Enhancements

1. **Lazy Loading**: Dynamically import chart builders for code splitting
2. **Plugin System**: Allow custom chart type registration
3. **Advanced Configurations**: Add more chart-specific options
4. **Animation Controls**: Per-chart animation configurations
5. **Accessibility**: ARIA labels and keyboard navigation per chart type

## Troubleshooting

### TypeScript Errors
If you see type errors about `data` being `undefined`:
- Ensure all series have optional `data` and `value` properties
- Check that chart builders handle empty data gracefully

### Chart Not Rendering
- Verify the chart type matches the case statement in EChartWrapper
- Check that the builder is properly exported from `types/index.ts`
- Inspect browser console for ECharts errors

### Configuration Not Applying
- Ensure visualConfig is properly mapped in the switch statement
- Check nested property access (e.g., `visualConfig?.bar?.stacking`)
- Verify the chart builder expects the configuration key

## Files Modified/Created

### Created
- `types/BarChart.ts`
- `types/LineChart.ts`
- `types/AreaChart.ts`
- `types/PieChart.ts`
- `types/DonutChart.ts`
- `types/ScatterChart.ts`
- `types/HeatmapChart.ts`
- `types/RadarChart.ts`
- `types/TreemapChart.ts`
- `types/SunburstChart.ts`
- `types/FunnelChart.ts`
- `types/GaugeChart.ts`
- `types/index.ts`
- `types/fix-types.sh`

### Modified
- `EChartWrapper.tsx` - Refactored to use chart builders

### Backed Up
- `EChartWrapper.tsx.backup` - Original monolithic version
- `EChartWrapper.tsx.corrupted` - Corrupted version (can be deleted)

## Conclusion

This refactoring significantly improves the codebase structure while maintaining full backward compatibility. The modular architecture makes it easier to:
- Add new chart types
- Fix chart-specific bugs
- Write unit tests
- Understand chart configurations
- Maintain and extend the codebase
