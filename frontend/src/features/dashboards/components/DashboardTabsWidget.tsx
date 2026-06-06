import React, { useState } from 'react';
import { Plus, Trash2, Settings, Layers } from 'lucide-react';
import DashboardWidget from '../DashboardWidget';
import SelectChartModal from './SelectChartModal';

interface TabData {
  id: string;
  label: string;
  chart_id: number | null;
}

interface Chart {
  id: number;
  title: string;
  chart_type: string;
}

interface DashboardTabsWidgetProps {
  content: string;
  isEditing: boolean;
  onUpdateContent: (newContent: string) => void;
  availableCharts: Chart[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalFilters: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refreshInterval: any;
  theme: string;
  styleConfig?: {
    font_size?: number;
    font_color?: string;
    font_family?: string;
    text_alignment?: 'left' | 'center' | 'right' | 'justify';
    background_color?: string;
    is_transparent?: boolean;
    font_weight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
    font_style?: 'normal' | 'italic' | 'oblique';
    padding?: string;
    margin?: string;
    border_radius?: string;
    opacity?: number;
  };
  dashboardTheme?: {
    text_color?: string;
    background_color?: string;
    title_font_size?: number;
    subtitle_font_size?: number;
    echarts_theme?: string;
    // Theme meta properties matching chart components
    themeMeta?: {
      background?: string;
      text?: string;
      primary?: string;
      secondary?: string;
      colors?: string[];
      border?: string;
      heading?: string;
    };
  };
  onDrillFiltersChange?: (chartId: number, filters: Record<string, any>, drillStack: any[]) => void;
  restoreDrillAction?: { stack: any[]; timestamp: number };
}

const DashboardTabsWidget: React.FC<DashboardTabsWidgetProps> = ({
  content,
  isEditing,
  onUpdateContent,
  availableCharts,
  globalFilters,
  refreshInterval,
  theme,
  styleConfig,
  dashboardTheme,
  onDrillFiltersChange,
  restoreDrillAction
}) => {
  let tabs: TabData[] = [];
  try {
    tabs = JSON.parse(content || '[]');
  } catch (err) {
    tabs = [{ id: 'tab1', label: 'Tab 1', chart_id: null }];
  }

  if (tabs.length === 0) {
    tabs = [{ id: 'default_tab', label: 'Tab 1', chart_id: null }];
  }

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  // Ensure active tab is valid
  if (!tabs.find(t => t.id === activeTabId)) {
    if (tabs.length > 0) setActiveTabId(tabs[0].id);
  }

  const handleUpdateTabs = (newTabs: TabData[]) => {
    onUpdateContent(JSON.stringify(newTabs));
  };

  const addTab = () => {
    // eslint-disable-next-line react-hooks/purity
    const newTab: TabData = { id: `tab_${Date.now()}`, label: `Tab ${tabs.length + 1}`, chart_id: null };
    handleUpdateTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const removeTab = (idToRemove: string) => {
    if (tabs.length <= 1) return; // Must have at least one tab
    const newTabs = tabs.filter(t => t.id !== idToRemove);
    handleUpdateTabs(newTabs);
    if (activeTabId === idToRemove) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const updateTabLabel = (id: string, newLabel: string) => {
    handleUpdateTabs(tabs.map(t => t.id === id ? { ...t, label: newLabel } : t));
  };

  const updateTabChart = (id: string, chartId: number | null) => {
    handleUpdateTabs(tabs.map(t => t.id === id ? { ...t, chart_id: chartId } : t));
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Use themeMeta directly from dashboardTheme (passed from parent)
  // This matches the same pattern used by KPI tiles and DataTable
  const themeMeta = dashboardTheme?.themeMeta || {
    background: '#ffffff',
    text: '#1e293b',
    primary: '#4935fa',
    secondary: '#4b6b99',
    colors: ['#4935fa'],
    border: 'rgba(0,0,0,0.08)',
    heading: '#ffffff'
  };
  
  // Check if dashboard is using a custom theme
  const isCustomTheme = dashboardTheme?.echarts_theme && dashboardTheme.echarts_theme !== 'default';
  
  // Use themeMeta colors (matching KPI and DataTable pattern)
  // For default/no theme, use white background and blue accent colors
  const tabBarBg = isCustomTheme ? themeMeta.background : '#ffffff';
  // Inactive tab color: use secondary (muted) color if available, otherwise text with reduced opacity
  const inactiveTabColor = isCustomTheme ? (themeMeta.secondary || themeMeta.text) : '#64748b';
  const activeTabColor = themeMeta.primary;
  const tabBorderColor = isCustomTheme ? themeMeta.border : 'rgba(0,0,0,0.08)';
  const tabTextColor = themeMeta.text;
  
  // Apply style configuration with theme awareness
  const containerStyle: React.CSSProperties = {
    // Background color: theme first, then styleConfig
    backgroundColor: isCustomTheme 
      ? (styleConfig?.is_transparent ? 'transparent' : themeMeta.background)
      : (styleConfig?.background_color && !styleConfig?.is_transparent ? styleConfig.background_color : '#ffffff'),
    
    opacity: styleConfig?.opacity !== undefined ? styleConfig.opacity : 1,
    borderRadius: styleConfig?.border_radius,
    padding: styleConfig?.padding,
    margin: styleConfig?.margin,
    
    // Font properties: only apply if explicitly set or no custom theme
    fontSize: styleConfig?.font_size ? `${styleConfig.font_size}px` : undefined,
    color: styleConfig?.font_color || (isCustomTheme ? themeMeta.text : undefined),
    fontFamily: styleConfig?.font_family,
    fontWeight: styleConfig?.font_weight,
    fontStyle: styleConfig?.font_style,
    textAlign: styleConfig?.text_alignment,
  };

  return (
    <div 
      className="w-full h-full flex flex-col rounded-xl overflow-hidden" 
      onMouseDown={(e) => { if (isEditing) e.stopPropagation(); }}
      style={containerStyle}
    >
      {/* Tab Bar */}
      <div 
        className="flex items-center gap-1 px-2 pt-2 shrink-0 overflow-x-auto custom-scrollbar" 
        style={{ 
          backgroundColor: tabBarBg,
          borderBottom: `1px solid ${tabBorderColor}`
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer select-none whitespace-nowrap min-w-[100px] group ${
              activeTabId === tab.id 
                ? 'shadow-sm' 
                : 'hover:bg-opacity-50'
            }`}
            style={{
              backgroundColor: activeTabId === tab.id ? (isCustomTheme ? themeMeta.background : '#ffffff') : 'transparent',
              borderColor: activeTabId === tab.id ? themeMeta.primary : 'transparent',
              color: activeTabId === tab.id ? themeMeta.primary : inactiveTabColor,
              fontWeight: activeTabId === tab.id ? 'bold' : 'normal',
              fontSize: styleConfig?.font_size ? `${styleConfig.font_size}px` : '0.875rem',
              fontFamily: styleConfig?.font_family,
            }}
            onClick={() => setActiveTabId(tab.id)}
          >
            {isEditing ? (
              <input
                value={tab.label}
                onChange={(e) => updateTabLabel(tab.id, e.target.value)}
                className="bg-transparent outline-none w-24"
                style={{
                  color: activeTabId === tab.id ? activeTabColor : inactiveTabColor,
                  fontWeight: activeTabId === tab.id ? 'bold' : 'normal',
                }}
                placeholder="Tab Name"
              />
            ) : (
              <span 
                style={{ 
                  color: 'inherit', 
                  fontWeight: 'inherit',
                  fontSize: 'inherit',
                  fontFamily: 'inherit'
                }}
              >{tab.label}</span>
            )}
            
            {isEditing && tabs.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {isEditing && (
          <button
            onClick={addTab}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-t-lg transition-colors ml-1"
            style={{
              color: themeMeta.text,
              fontWeight: 'bold',
              fontSize: styleConfig?.font_size ? `${styleConfig.font_size * 0.875}px` : '0.75rem',
              fontFamily: styleConfig?.font_family,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = themeMeta.primary;
              e.currentTarget.style.backgroundColor = isCustomTheme ? `${themeMeta.background}33` : '#f0f4ff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = themeMeta.text;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus size={14} /> Add Tab
          </button>
        )}
        <div className="flex-1" />
        {isEditing && (
          <div className="flex items-center gap-2 mb-1.5 mr-1">
            <Settings size={14} className="text-slate-400" />
            <button
              onClick={() => setIsChartModalOpen(true)}
              className="text-xs font-bold text-slate-600 hover:text-brand bg-white border border-slate-200 hover:border-brand/30 px-3 py-1.5 rounded-md shadow-sm transition-all"
              style={{ backgroundColor: '#ffffff' }}
            >
              {activeTab.chart_id 
                ? (availableCharts.find(c => c.id === activeTab.chart_id)?.title || `Chart #${activeTab.chart_id}`) 
                : "Select Chart..."}
            </button>
            {activeTab.chart_id && (
              <button
                onClick={() => updateTabChart(activeTab.id, null)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Remove Chart"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div 
        className="flex-1 min-h-0 relative" 
        style={{
          backgroundColor: styleConfig?.is_transparent ? 'transparent' : (isCustomTheme ? themeMeta.background : '#ffffff'),
          borderTop: `1px solid ${isCustomTheme ? themeMeta.border : 'rgba(0,0,0,0.08)'}`
        }}
      >

        {activeTab.chart_id ? (
          <DashboardWidget
            chartId={activeTab.chart_id}
            filters={Object.fromEntries(Object.entries(globalFilters).filter(([k, v]) => v !== undefined && v !== ''))}
            refetchInterval={refreshInterval}
            theme={theme}
            onDrillFiltersChange={(drillFilters, drillStack) => onDrillFiltersChange?.(activeTab.chart_id!, drillFilters, drillStack)}
            restoreDrillAction={restoreDrillAction}
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center" 
            style={{ backgroundColor: isCustomTheme ? themeMeta.background : '#ffffff', color: themeMeta.text }}
          >
            <Layers size={32} className="mb-2 opacity-30" />
            <span className="text-sm font-medium">No chart selected for this tab</span>
            {isEditing && <span className="text-xs mt-1">Use the dropdown menu to assign a chart</span>}
          </div>
        )}
      </div>

      <SelectChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        hideLayoutTab={true}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSelectChart={(chart: any) => {
          if (chart.id !== -1) {
            updateTabChart(activeTab.id, chart.id);
            setIsChartModalOpen(false);
          }
        }}
      />
    </div>
  );
};

export default DashboardTabsWidget;
