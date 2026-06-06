# Dynamic Chart Configuration System

## Overview

The new dynamic configuration system allows each chart type to define its own configuration schema directly in its component file. This schema is then used to automatically generate the configuration UI in the chart builder, making the system more modular, maintainable, and self-documenting.

## Architecture

### Key Components

1. **Chart Type Files** (e.g., `BarChart.ts`, `LineChart.ts`)
   - Define chart-specific configuration schema
   - Export `build*ChartOptions` function
   - Export `*ChartConfigSchema` constant

2. **Config Schema System** (`config-schema.ts`)
   - Defines types for configuration fields and sections
   - Provides helper functions for nested config access
   - Standardizes schema structure across all chart types

3. **DynamicConfigControls** (`DynamicConfigControls.tsx`)
   - Reads schema from chart type
   - Renders appropriate UI controls based on field types
   - Handles state management and updates

4. **DynamicChartControls** (`DynamicChartControls.tsx`)
   - Wrapper component for ChartBuilderPage
   - Selects correct schema based on chart type
   - Delegates to DynamicConfigControls

## File Structure

```
frontend/src/components/charts/
├── types/
│   ├── config-schema.ts              # Base types and helpers
│   ├── DynamicConfigControls.tsx     # Dynamic UI renderer
│   ├── BarChart.ts                   # Bar chart + schema
│   ├── LineChart.ts                  # Line chart + schema
│   ├── AreaChart.ts                  # Area chart + schema
│   ├── PieChart.ts                   # (to be updated)
│   ├── DonutChart.ts                 # (to be updated)
│   └── index.ts                      # Exports all schemas
└── EChartWrapper.tsx                 # Main wrapper (unchanged)

frontend/src/features/charts/
└── components/
    ├── DynamicChartControls.tsx      # New dynamic controls
    └── SupersetChartControls.tsx     # Legacy (can be kept for compatibility)
```

## Configuration Schema Structure

### Basic Schema Definition

```typescript
import { createChartConfigSchema, type ChartConfigSchema } from './config-schema';

export const barChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'bar',
  sections: [
    {
      id: 'x_axis',
      title: 'X-Axis',
      icon: 'MoveHorizontal',
      defaultExpanded: true,
      fields: [
        {
          key: 'x_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter X-axis title',
          description: 'Title displayed below the X-axis',
        },
        {
          key: 'x_axis.labelRotation',
          label: 'Label Rotation',
          type: 'range',
          min: 0,
          max: 90,
          step: 15,
          defaultValue: 0,
          description: 'Rotate X-axis labels (0-90 degrees)',
        },
      ],
    },
  ],
  defaultConfig: {
    x_axis: {
      title: '',
      labelRotation: 0,
    },
  },
});
```

### Field Types

| Type | Description | Props |
|------|-------------|-------|
| `text` | Text input | `placeholder` |
| `number` | Number input | - |
| `boolean` | Toggle switch | - |
| `select` | Dropdown | `options: [{label, value}]` |
| `radio` | Radio buttons | `options: [{label, value}]` |
| `range` | Slider | `min`, `max`, `step` |
| `color` | Color picker | - |

### Nested Configuration Paths

Use dot notation to access nested configuration:

```typescript
// Path: 'x_axis.title'
// Maps to: visualConfig.x_axis.title

// Path: 'bar.stacking'
// Maps to: visualConfig.bar.stacking
```

## Usage in Chart Builder

### Basic Integration

```typescript
import { DynamicChartControls } from './components/DynamicChartControls';

function ChartBuilderPage() {
  const [chartType, setChartType] = useState('bar');
  const [visualConfig, setVisualConfig] = useState({});

  return (
    <div className="flex h-screen">
      {/* Chart preview */}
      <div className="flex-1">
        <EChartWrapper
          chartType={chartType as any}
          data={chartData}
          visualConfig={visualConfig}
        />
      </div>

      {/* Configuration panel */}
      <div className="w-96 p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
        <DynamicChartControls
          chartType={chartType}
          config={visualConfig}
          onChange={setVisualConfig}
        />
      </div>
    </div>
  );
}
```

## Adding Configuration to New Chart Types

### Step 1: Define Schema in Chart File

```typescript
// PieChart.ts
import { createChartConfigSchema } from './config-schema';

export const pieChartConfigSchema = createChartConfigSchema({
  chartType: 'pie',
  sections: [
    {
      id: 'legend',
      title: 'Legend',
      icon: 'LayoutList',
      defaultExpanded: true,
      fields: [
        {
          key: 'legend.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'legend.orientation',
          label: 'Orientation',
          type: 'select',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' },
          ],
          defaultValue: 'horizontal',
        },
      ],
    },
    {
      id: 'pie',
      title: 'Pie Settings',
      icon: 'PieChart',
      defaultExpanded: false,
      fields: [
        {
          key: 'pie.donut',
          label: 'Donut Style',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'pie.innerRadius',
          label: 'Inner Radius',
          type: 'range',
          min: 20,
          max: 60,
          step: 5,
          defaultValue: 40,
        },
      ],
    },
  ],
  defaultConfig: {
    legend: { show: true, orientation: 'horizontal' },
    pie: { donut: false, innerRadius: 40 },
  },
});
```

### Step 2: Export from index.ts

```typescript
export { buildPieChartOptions, pieChartConfigSchema } from './PieChart';
```

### Step 3: Add to Schema Registry

```typescript
// In index.ts
export function getChartConfigSchema(chartType: string): ChartConfigSchema | undefined {
  const schemas: Record<string, ChartConfigSchema> = {
    bar: barChartConfigSchema,
    line: lineChartConfigSchema,
    pie: pieChartConfigSchema,  // Add new schemas here
    // ...
  };
  return schemas[chartType];
}
```

## Configuration State Management

### Nested Updates

The system automatically handles nested configuration updates:

```typescript
// User changes X-axis title
// Field key: 'x_axis.title'
// New value: 'Sales by Month'

// System updates:
setVisualConfig(prev => ({
  ...prev,
  x_axis: {
    ...prev.x_axis,
    title: 'Sales by Month'
  }
}));
```

### Default Values

Default values are defined in the schema and applied when:
- Component first loads
- User resets to defaults
- Missing configuration keys

```typescript
// Schema defines:
defaultConfig: {
  x_axis: { labelRotation: 0 }
}

// If user hasn't set labelRotation, it defaults to 0
```

## Benefits

### 1. **Self-Documenting**
Each chart type defines its own configuration, making it clear what options are available:

```typescript
// BarChart.ts - clearly shows all bar chart options
export const barChartConfigSchema = { ... }
```

### 2. **Type Safety**
Configuration is strongly typed through TypeScript interfaces:

```typescript
interface BarChartOptions {
  visualConfig?: {
    x_axis?: { title?: string; labelRotation?: number };
    bar?: { stacking?: boolean; barWidth?: number };
  };
}
```

### 3. **Modularity**
Adding new chart types doesn't require modifying shared code:

```typescript
// Just create MyNewChart.ts with its schema
// No changes to DynamicConfigControls needed
```

### 4. **Consistency**
All chart configurations follow the same structure:

```typescript
// Standard sections across charts
- x_axis
- y_axis  
- legend
- dataLabels
- [chart-specific]
```

### 5. **Maintainability**
Changes to a chart's configuration only affect that chart:

```typescript
// Modify BarChart.ts only
// No risk of breaking LineChart or PieChart
```

## Migration from SupersetChartControls

### Phase 1: Keep Both (Current State)

```typescript
// Use DynamicChartControls for new charts
// Keep SupersetChartControls for backward compatibility
```

### Phase 2: Migrate Chart by Chart

1. Update BarChart.ts with schema ✅
2. Update LineChart.ts with schema ✅
3. Update PieChart.ts with schema (pending)
4. Update DonutChart.ts with schema (pending)
5. ... continue for all chart types

### Phase 3: Deprecate Legacy

```typescript
// Once all charts migrated, remove SupersetChartControls
// Or keep as fallback for custom charts
```

## Example: Complete Bar Chart Configuration

### Schema Definition

```typescript
export const barChartConfigSchema = createChartConfigSchema({
  chartType: 'bar',
  sections: [
    {
      id: 'x_axis',
      title: 'X-Axis',
      icon: 'MoveHorizontal',
      defaultExpanded: true,
      fields: [
        {
          key: 'x_axis.title',
          label: 'Title',
          type: 'text',
          placeholder: 'Enter X-axis title',
        },
        {
          key: 'x_axis.labelRotation',
          label: 'Label Rotation',
          type: 'range',
          min: 0,
          max: 90,
          step: 15,
          defaultValue: 0,
        },
        {
          key: 'x_axis.truncate',
          label: 'Truncate Long Labels',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'bar',
      title: 'Bar Settings',
      icon: 'BarChart3',
      defaultExpanded: false,
      fields: [
        {
          key: 'bar.stacking',
          label: 'Stacked Bars',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'bar.barWidth',
          label: 'Bar Width',
          type: 'range',
          min: 10,
          max: 100,
          step: 5,
          defaultValue: 40,
        },
      ],
    },
  ],
  defaultConfig: {
    x_axis: { title: '', labelRotation: 0, truncate: true },
    bar: { stacking: false, barWidth: 40 },
  },
});
```

### Resulting UI

The schema automatically generates:

```
┌─ X-Axis (expanded) ──────────────────┐
│ Title: [____________]                │
│ Label Rotation: [====○====] 0        │
│ Truncate Long Labels: [●───] On      │
└──────────────────────────────────────┘

┌─ Legend ─────────────────────────────┐
│ Show Legend: [●───] On               │
│ Orientation: [Horizontal] [Vertical] │
└──────────────────────────────────────┘

┌─ Bar Settings ───────────────────────┐
│ Stacked Bars: [──○──] Off            │
│ Bar Width: [======○===] 40           │
└──────────────────────────────────────┘
```

## Troubleshooting

### Configuration Not Applying

**Problem**: Changes in UI don't affect the chart

**Solution**: 
1. Check schema field keys match visualConfig structure
2. Verify chart builder passes config correctly
3. Check EChartWrapper reads nested paths

### Schema Not Found

**Problem**: "No configuration available for this chart type"

**Solution**:
1. Ensure schema is exported from chart file
2. Register schema in `getChartConfigSchema()`
3. Check chartType string matches exactly

### Default Values Not Applied

**Problem**: Config starts empty instead of using defaults

**Solution**:
1. Ensure `defaultConfig` is defined in schema
2. Initialize state with defaults in ChartBuilderPage
3. Check DynamicConfigControls receives initial config

## Future Enhancements

1. **Schema Validation**: Add Zod or Yup validation
2. **Conditional Fields**: Show/hide fields based on other values
3. **Custom Renderers**: Allow custom UI components per field
4. **Schema Inheritance**: Extend base schemas for variations
5. **Internationalization**: Multi-language support for labels
6. **Schema Export**: Generate schema docs automatically

## Summary

The dynamic configuration system transforms chart customization from a monolithic, hard-to-maintain component into a modular, self-documenting architecture where each chart type owns its configuration. This makes it:

- ✅ Easier to add new chart types
- ✅ Simpler to modify existing configurations  
- ✅ Clearer what options each chart supports
- ✅ Consistent across all chart types
- ✅ Type-safe and IDE-friendly

Start by updating remaining chart types (Pie, Donut, etc.) with their schemas, then gradually migrate the chart builder to use the dynamic system.
