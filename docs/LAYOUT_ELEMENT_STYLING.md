# Dashboard Layout Element Styling Feature

## Overview
Added comprehensive styling configuration options for dashboard layout elements (header, text, divider, tabs) allowing users to customize font size, color, font family, alignment, background color, transparency, and more.

## Changes Made

### 1. TypeScript Interface Updates

#### `DashboardLayoutItem` Interface (DashboardViewPage.tsx)
Added `style_config` field with the following properties:
- `font_size?: number` - Font size in pixels
- `font_color?: string` - Text color (hex format)
- `font_family?: string` - Font family name
- `text_alignment?: 'left' | 'center' | 'right' | 'justify'` - Text alignment
- `background_color?: string` - Background color (hex format)
- `is_transparent?: boolean` - Enable transparent background
- `font_weight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number` - Font weight
- `font_style?: 'normal' | 'italic' | 'oblique'` - Font style
- `padding?: string` - CSS padding value
- `margin?: string` - CSS margin value
- `border_radius?: string` - CSS border radius
- `opacity?: number` - Opacity value (0-1)

### 2. Helper Function

#### `applyLayoutStyle()` Function
Created a utility function that applies style configuration to layout elements:
```typescript
const applyLayoutStyle = (styleConfig?: DashboardLayoutItem['style_config'], defaultStyles?: React.CSSProperties): React.CSSProperties
```

This function:
- Merges custom styles with default styles
- Handles transparent backgrounds
- Converts font size to pixels
- Applies all CSS properties from style_config

### 3. Component Updates

#### DashboardViewPage.tsx
**Rendering Updates:**
- **Header Widget**: Applies style_config to container and h2 element
- **Text Widget**: Applies style_config to container and ReactMarkdown wrapper
- **Divider Widget**: Applies background_color and opacity to divider line
- **Tabs Widget**: Passes styleConfig prop to DashboardTabsWidget component

**Edit Mode Updates:**
- Added Palette icon button in widget header for layout elements
- Button only appears for non-chart widgets (header, text, divider, tabs)
- Opens style editor modal when clicked

**State Management:**
- Added `selectedWidgetId` state to track which widget is being styled
- Added `isStyleEditorOpen` state for modal visibility
- Added `updateWidgetStyleConfig()` function to update style configuration
- Added `openStyleEditor()` and `closeStyleEditor()` handlers

#### DashboardTabsWidget.tsx
**Interface Updates:**
- Added `styleConfig` prop to `DashboardTabsWidgetProps` interface

**Rendering Updates:**
- Container div now applies style configuration via inline styles
- Supports background color, transparency, opacity, border radius, padding, and margin

#### WidgetStyleEditor.tsx (NEW COMPONENT)
Created a comprehensive style editor modal with the following sections:

**Typography Section:**
- Font size input (8-72px)
- Font color picker (color input + text input)
- Font family dropdown (common fonts)
- Font weight dropdown (normal, bold, lighter, bolder)
- Font style dropdown (normal, italic, oblique)

**Alignment Section:**
- Text alignment buttons (left, center, right, justify)
- Visual icons for each alignment option

**Background & Appearance Section:**
- Background color picker (color input + text input)
- Transparent checkbox (disables background color)
- Opacity slider (0-100%)

**Spacing & Border Section:**
- Padding text input (CSS format, e.g., "16px")
- Border radius text input (CSS format, e.g., "8px")

**Features:**
- Reset to default button
- Real-time preview via onChange callback
- Modal with save/cancel actions

### 4. UI Components

#### Style Button in Widget Header
- Appears only in edit mode
- Only for layout elements (not charts)
- Purple color scheme to distinguish from other actions
- Tooltip: "Style Widget"

#### Style Editor Modal
- Fixed overlay with backdrop blur
- Scrollable content area (max-height: 70vh)
- Save and Cancel buttons
- Auto-saves to layout and triggers save mutation

## Usage

### Adding a Styled Layout Element

1. Enter Edit Mode on dashboard
2. Click "Add Widget"
3. Select layout element type (header, text, divider, tabs)
4. Click the Palette icon in the widget header
5. Configure styles in the modal
6. Click "Save Changes"

### Modifying Existing Styles

1. Enter Edit Mode
2. Click the Palette icon on any layout element
3. Adjust styles in the modal
4. Click "Save Changes"

### Style Inheritance

- Styles are applied via inline CSS
- Child elements inherit color, font-family, and text-align via `inherit` keyword
- Font size must be explicitly set on each element
- Transparent backgrounds show the dashboard background color

## Database Storage

Style configuration is stored in the `layout` JSONB column of the `dashboards` table:

```json
{
  "i": "widget-id",
  "x": 0,
  "y": 0,
  "w": 6,
  "h": 4,
  "chart_id": 123,
  "title": "My Widget",
  "widget_type": "header",
  "content": "Dashboard Title",
  "style_config": {
    "font_size": 24,
    "font_color": "#1a1a1a",
    "font_family": "sans-serif",
    "text_alignment": "center",
    "background_color": "#f0f0f0",
    "is_transparent": false,
    "font_weight": "bold",
    "opacity": 1
  }
}
```

## Browser Compatibility

All CSS properties used are widely supported:
- `fontSize` - All browsers
- `color` - All browsers
- `fontFamily` - All browsers
- `textAlign` - All browsers
- `backgroundColor` - All browsers
- `opacity` - All browsers (IE9+)
- `borderRadius` - All browsers (IE9+)
- `padding`/`margin` - All browsers

## Future Enhancements

Potential improvements:
1. Preset style themes for quick application
2. Copy style from one widget to another
3. Style history/undo functionality
4. Advanced spacing controls (individual padding/margin sides)
5. Border styling (color, width, style)
6. Box shadow options
7. Gradient backgrounds
8. Custom CSS class support
9. Style templates for different widget types
10. Responsive style overrides (mobile vs desktop)

## Testing Checklist

- [ ] Test all font size values (8px to 72px)
- [ ] Test color picker with various hex values
- [ ] Test font family dropdown selections
- [ ] Test all alignment options
- [ ] Test transparent background toggle
- [ ] Test opacity slider (0% to 100%)
- [ ] Test padding and radius inputs
- [ ] Test save functionality
- [ ] Test cancel functionality
- [ ] Test style persistence after page reload
- [ ] Test with all layout element types (header, text, divider, tabs)
- [ ] Test in edit mode and view mode
- [ ] Test mobile responsiveness
- [ ] Test with dark mode themes
- [ ] Test style overrides on nested elements
