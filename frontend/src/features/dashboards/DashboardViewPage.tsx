import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout/legacy';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import DashboardWidget from './DashboardWidget';
import DashboardSettingsPanel from './DashboardSettingsPanel';
import DashboardFiltersPanel from './DashboardFiltersPanel';
import DashboardFilter from './DashboardFilter';
import { registerThemeOnTheFly, getThemeMeta } from '../../components/charts/themes';
import {
  Save, Maximize2, X, Plus, Loader2, LayoutDashboard,
  Filter, Settings, FilterX,
  BarChart3, PieChart, LineChart, TrendingUp, Table as TableIcon, Trash2,
  Bookmark, Info, MoreHorizontal, Clock, ExternalLink,
  ChevronDown, Undo2, Redo2, Check, Sparkles, Palette, RefreshCw
} from 'lucide-react';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';
import DashboardAIChat from './DashboardAIChat';
import SelectChartModal from './components/SelectChartModal';
import DashboardTabsWidget from './components/DashboardTabsWidget';
import WidgetStyleEditor from './components/WidgetStyleEditor';
import { useNavigate } from 'react-router-dom';
import { useLOBStore } from '../../store/useLOBStore';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(RGL);

// Helper function to extract theme colors - uses getThemeMeta from themes.ts
// which already handles dynamicThemeMetaCache populated by registerThemeOnTheFly
const extractThemeMeta = (themeName: string | undefined, dbThemes: any[], dashboardColors: { background_color?: string; text_color?: string }) => {
  // First try getThemeMeta which checks dynamicThemeMetaCache (populated by registerThemeOnTheFly)
  if (themeName && themeName !== 'default') {
    const cachedMeta = getThemeMeta(themeName);
    if (cachedMeta) {
      return {
        ...cachedMeta,
        heading: cachedMeta.text || '#1e293b'
      };
    }
  }
  // Fallback to dashboard colors
  return {
    background: dashboardColors.background_color || '#ffffff',
    text: dashboardColors.text_color || '#1e293b',
    border: 'rgba(255, 255, 255, 0.08)',
    primary: '#4935fa',
    secondary: '#64748b',
    colors: ['#4935fa'],
    heading: dashboardColors.text_color || '#ffffff'
  };
};

interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  chart_id: number;
  title: string;
  widget_type?: 'chart' | 'header' | 'text' | 'divider' | 'tabs';
  content?: string;
  // Styling configuration for layout elements
  style_config?: {
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
}

interface Dashboard {
  id: number;
  title: string;
  description: string;
  layout: DashboardLayoutItem[];
  owner_id: string;
  owner_name?: string;
  background_color?: string;
  text_color?: string;
  description_color?: string;
  icon_color?: string;
  title_font_size?: number;
  subtitle_font_size?: number;
  logo_size?: string;
  filter_config?: FilterDef[];
  filter_presets?: FilterPreset[];
  logo_url?: string;
  grid_gap?: number;
  grid_cols?: number;
  row_height?: number;
  roles?: any[];
  is_favorite?: boolean;
  echarts_theme?: string;
  llm_config?: any;
  co_owners?: any[];
  role_ids?: number[];
  cache_config?: any;
}

interface FilterDef {
  id: string;
  label: string;
  column: string;
  type: 'select' | 'text' | 'date_range';
  source?: 'static' | 'dynamic';
  dataset_id?: number;
  value_column?: string;
  options?: string[];
  default_value?: string;
  is_required?: boolean;
  enable_drill_down?: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  is_default: boolean;
  state: Record<string, any>;
  drill_stacks?: Record<number, any[]>;
}

// Helper function to apply style configuration to layout elements
// Respects dashboard theme first, only applies custom styling when theme is "default"
const applyLayoutStyle = (
  styleConfig?: DashboardLayoutItem['style_config'], 
  defaultStyles?: React.CSSProperties,
  dashboardTheme?: { 
    text_color?: string; 
    background_color?: string; 
    title_font_size?: number;
    subtitle_font_size?: number;
    echarts_theme?: string;
  }
): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Check if dashboard is using a custom theme (not "default")
  const isCustomTheme = dashboardTheme?.echarts_theme && dashboardTheme.echarts_theme !== 'default';
  
  if (isCustomTheme) {
    // Apply dashboard theme colors and sizes first
    if (dashboardTheme.text_color) {
      styles.color = dashboardTheme.text_color;
    }
    
    if (dashboardTheme.background_color) {
      styles.backgroundColor = dashboardTheme.background_color;
    }
    
    // Apply theme font sizes based on defaultStyles context
    if (dashboardTheme.title_font_size && defaultStyles?.fontSize === '1.5rem') {
      styles.fontSize = `${dashboardTheme.title_font_size}px`;
    } else if (dashboardTheme.subtitle_font_size && defaultStyles?.fontSize === '1.25rem') {
      styles.fontSize = `${dashboardTheme.subtitle_font_size}px`;
    } else if (dashboardTheme.title_font_size && defaultStyles?.fontWeight === 'bold') {
      // For headers with bold weight
      styles.fontSize = `${dashboardTheme.title_font_size}px`;
    } else if (dashboardTheme.subtitle_font_size && defaultStyles?.fontSize === '0.875rem') {
      // For text widgets
      styles.fontSize = `${dashboardTheme.subtitle_font_size}px`;
    }
    
    // Custom styling overrides when explicitly set in styleConfig
    if (styleConfig) {
      // Transparent overrides theme background
      if (styleConfig.is_transparent) {
        styles.backgroundColor = 'transparent';
      }
      
      // Font properties override theme if explicitly set
      if (styleConfig.font_size) {
        styles.fontSize = `${styleConfig.font_size}px`;
      }
      if (styleConfig.font_color) {
        styles.color = styleConfig.font_color;
      }
      if (styleConfig.font_family) {
        styles.fontFamily = styleConfig.font_family;
      }
      if (styleConfig.text_alignment) {
        styles.textAlign = styleConfig.text_alignment;
      }
      if (styleConfig.font_weight) {
        styles.fontWeight = styleConfig.font_weight;
      }
      if (styleConfig.font_style) {
        styles.fontStyle = styleConfig.font_style;
      }
      // Background color override (unless transparent)
      if (styleConfig.background_color && !styleConfig.is_transparent) {
        styles.backgroundColor = styleConfig.background_color;
      }
      if (styleConfig.padding) {
        styles.padding = styleConfig.padding;
      }
      if (styleConfig.margin) {
        styles.margin = styleConfig.margin;
      }
      if (styleConfig.border_radius) {
        styles.borderRadius = styleConfig.border_radius;
      }
      if (styleConfig.opacity !== undefined) {
        styles.opacity = styleConfig.opacity;
      }
    }
  } else {
    // No custom theme - apply styleConfig or defaults
    if (styleConfig) {
      if (styleConfig.font_size) {
        styles.fontSize = `${styleConfig.font_size}px`;
      }
      
      if (styleConfig.font_color) {
        styles.color = styleConfig.font_color;
      }
      
      if (styleConfig.font_family) {
        styles.fontFamily = styleConfig.font_family;
      }
      
      if (styleConfig.text_alignment) {
        styles.textAlign = styleConfig.text_alignment;
      }
      
      if (styleConfig.font_weight) {
        styles.fontWeight = styleConfig.font_weight;
      }
      
      if (styleConfig.font_style) {
        styles.fontStyle = styleConfig.font_style;
      }
      
      if (styleConfig.background_color && !styleConfig.is_transparent) {
        styles.backgroundColor = styleConfig.background_color;
      } else if (styleConfig.is_transparent) {
        styles.backgroundColor = 'transparent';
      }
      
      if (styleConfig.padding) {
        styles.padding = styleConfig.padding;
      }
      
      if (styleConfig.margin) {
        styles.margin = styleConfig.margin;
      }
      
      if (styleConfig.border_radius) {
        styles.borderRadius = styleConfig.border_radius;
      }
      
      if (styleConfig.opacity !== undefined) {
        styles.opacity = styleConfig.opacity;
      }
    }
  }
  
  return styles;
};

const resolveDynamicVariables = (val: string): string => {
  if (!val || typeof val !== 'string') return val;
  const now = new Date();
  
  const replacements: Record<string, () => string> = {
    '{{CURRENT_DATE}}': () => now.toISOString().split('T')[0],
    '{{PREVIOUS_DATE}}': () => {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    },
    '{{CURRENT_MONTH}}': () => {
      const d = new Date(now);
      d.setDate(1);
      return d.toISOString().split('T')[0];
    },
    '{{PREVIOUS_MONTH}}': () => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
      return d.toISOString().split('T')[0];
    },
    '{{CURRENT_YEAR}}': () => {
      const d = new Date(now);
      d.setMonth(0, 1);
      return d.toISOString().split('T')[0];
    }
  };

  let result = val;
  for (const [key, resolver] of Object.entries(replacements)) {
    if (result.includes(key)) {
      result = result.replace(new RegExp(key, 'g'), resolver());
    }
  }
  return result;
};

interface Chart {
  id: number;
  title: string;
  chart_type: string;
  folder?: string;
  dataset_id?: number;
}

const DashboardViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeLOB } = useLOBStore();
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayoutItem[]>([]);
  const [showAddChart, setShowAddChart] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // New State for Filters and Refresh
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [stagedFilters, setStagedFilters] = useState<Record<string, any>>({});
  
  // Track drill filters applied by each chart widget (key: chartId)
  const [chartsDrillFilters, setChartsDrillFilters] = useState<Record<number, Record<string, string | string[]>>>({});
  // Track drill stacks for saving views
  const [chartsDrillStacks, setChartsDrillStacks] = useState<Record<number, any[]>>({});
  // Signal to widgets to restore drill stacks
  const [restoreDrillAction, setRestoreDrillAction] = useState<{ stacks: Record<number, any[]>; timestamp: number } | null>(null);

  // Global History Tracking
  const [historyState, setHistoryState] = useState<{
    history: { globalFilters: Record<string, any>; chartsDrillStacks: Record<number, any[]> }[];
    index: number;
  }>({
    history: [{ globalFilters: {}, chartsDrillStacks: {} }],
    index: 0,
  });
  const isRestoringHistory = useRef(false);

  // Global History Effect
  useEffect(() => {
    if (isRestoringHistory.current) {
      // If we are currently restoring from history, we skip recording this change
      // and reset the flag for future user interactions
      const timer = setTimeout(() => { isRestoringHistory.current = false; }, 200);
      return () => clearTimeout(timer);
    }
    
    setHistoryState(prev => {
      const currentSnapshot = prev.history[prev.index];
      const newSnapshot = { globalFilters, chartsDrillStacks };
      
      // Deep equality check to prevent duplicate snapshots
      if (JSON.stringify(currentSnapshot) === JSON.stringify(newSnapshot)) return prev;

      const nextHistory = prev.history.slice(0, prev.index + 1);
      nextHistory.push(newSnapshot);
      let nextIndex = nextHistory.length - 1;
      
      // Limit to 50 items
      if (nextHistory.length > 50) {
        nextHistory.shift();
        nextIndex--;
      }
      return { history: nextHistory, index: nextIndex };
    });
  }, [globalFilters, chartsDrillStacks]);

  const handleGlobalGoBack = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index > 0) {
        const nextIndex = prev.index - 1;
        const snapshot = prev.history[nextIndex];
        
        isRestoringHistory.current = true;
        setGlobalFilters(snapshot.globalFilters);
        setStagedFilters(snapshot.globalFilters); // Also stage them so the filter bar shows correct state
        setRestoreDrillAction({ stacks: snapshot.chartsDrillStacks, timestamp: Date.now() });
        
        return { ...prev, index: nextIndex };
      }
      return prev;
    });
  }, []);

  const handleGlobalGoForward = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index < prev.history.length - 1) {
        const nextIndex = prev.index + 1;
        const snapshot = prev.history[nextIndex];
        
        isRestoringHistory.current = true;
        setGlobalFilters(snapshot.globalFilters);
        setStagedFilters(snapshot.globalFilters);
        setRestoreDrillAction({ stacks: snapshot.chartsDrillStacks, timestamp: Date.now() });
        
        return { ...prev, index: nextIndex };
      }
      return prev;
    });
  }, []);

  const canGoBack = historyState.index > 0;
  const canGoForward = historyState.index < historyState.history.length - 1;

  const handleWidgetDrillFiltersChange = useCallback((chartId: number, drillFilters: Record<string, string | string[]>, drillStack?: any[]) => {
    setChartsDrillFilters(prev => {
      // If drillFilters is empty, remove the entry
      if (!drillFilters || Object.keys(drillFilters).length === 0) {
        const next = { ...prev };
        delete next[chartId];
        return next;
      }
      return {
        ...prev,
        [chartId]: drillFilters
      };
    });
    
    setChartsDrillStacks(prev => {
      if (!drillStack || drillStack.length === 0) {
        const next = { ...prev };
        delete next[chartId];
        return next;
      }
      return { ...prev, [chartId]: drillStack };
    });
  }, []);

  const effectiveFilters = useMemo(() => {
    const children: any[] = [];

    // Add global filters
    Object.entries(globalFilters).forEach(([col, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        children.push({
          type: 'rule',
          column_name: col,
          operator: Array.isArray(val) ? 'IN' : 'EQUALS',
          value: val
        });
      }
    });

    // Add drill filters from all widgets
    Object.values(chartsDrillFilters).forEach((widgetDrillFilters) => {
      Object.entries(widgetDrillFilters).forEach(([col, filterLevels]) => {
        if (filterLevels !== undefined && filterLevels !== null && filterLevels !== '') {
          const levels = Array.isArray(filterLevels) ? filterLevels : [filterLevels];
          
          levels.forEach(levelValue => {
            if (Array.isArray(levelValue)) {
              const inValues = levelValue.filter(v => typeof v !== 'string' || !v.startsWith('__EXCLUDE__'));
              const excludeValues = levelValue.filter(v => typeof v === 'string' && v.startsWith('__EXCLUDE__')).map(v => v.replace(/^__EXCLUDE__/, ''));
              
              if (inValues.length > 0) {
                children.push({
                  type: 'rule',
                  column_name: col,
                  operator: inValues.length > 1 ? 'IN' : 'EQUALS',
                  value: inValues.length > 1 ? inValues : inValues[0]
                });
              }
              if (excludeValues.length > 0) {
                children.push({
                  type: 'rule',
                  column_name: col,
                  operator: excludeValues.length > 1 ? 'NOT_IN' : 'NOT_EQUALS',
                  value: excludeValues.length > 1 ? excludeValues : excludeValues[0]
                });
              }
            } else {
              let isExclude = false;
              let actualValue: any = levelValue;
              if (typeof levelValue === 'string' && levelValue.startsWith('__EXCLUDE__')) {
                isExclude = true;
                actualValue = levelValue.substring(11);
              }
              children.push({
                type: 'rule',
                column_name: col,
                operator: isExclude ? 'NOT_EQUALS' : 'EQUALS',
                value: actualValue
              });
            }
          });
        }
      });
    });

    if (children.length === 0) return {};

    return {
      type: 'group',
      operator: 'AND',
      children
    };
  }, [globalFilters, chartsDrillFilters]);
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | false>(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(true);
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewIsDefault, setNewViewIsDefault] = useState(false);
  const [saveDrillFilters, setSaveDrillFilters] = useState(true);
  const [isRefreshOpen, setIsRefreshOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [isStyleEditorOpen, setIsStyleEditorOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Responsive mobile support state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Settle layout rendering
  useEffect(() => {
    // Delay rendering actual ECharts components until the DOM and layout have settled
    // This prevents ECharts from rendering with wrong widths during initial load or animations
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
    }, 550); 
    return () => clearTimeout(timer);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (dashboardRef.current) {
        dashboardRef.current.requestFullscreen().catch(e => {
          toast.error(`Error enabling fullscreen: ${e.message}`);
        });
        setIsFullScreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Fetch Dashboard
  const { data: dashboard, isLoading } = useQuery<Dashboard>({
    queryKey: ['dashboards', id],
    queryFn: async () => {
      const response = await api.get(`/api/dashboards/${id}`);
      return response.data;
    },
  });

  // Fetch and register custom uploaded themes dynamically
  const { data: dbThemes } = useQuery<any[]>({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await api.get('/api/themes/');
      response.data.forEach((theme: any) => {
        registerThemeOnTheFly(theme.name, theme.config);
      });
      return response.data;
    }
  });

  const displayDashboard = useMemo(() => {
    if (!dashboard) return null;
    return { ...dashboard, ...previewSettings } as Dashboard;
  }, [dashboard, previewSettings]);

  const isOwner = useMemo(() => {
    if (!user || !dashboard) return false;
    return user.id === dashboard.owner_id;
  }, [user, dashboard]);

  const sortedMobileLayout = useMemo(() => {
    return [...layout].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }, [layout]);

  // Fetch Available Charts (always enabled now for type checking)
  const { data: availableCharts } = useQuery<Chart[]>({
    queryKey: ['dashboard-available-charts', dashboard?.id],
    queryFn: async () => {
      const params: any = { limit: 1000 };
      if (dashboard?.id) params.dashboard_id = dashboard.id;
      const response = await api.get('/api/charts/', { params });
      return response.data;
    },
    enabled: !!dashboard, // Fetch if dashboard exists for type checking and AI context
  });

  const contextDatasetIds = useMemo(() => {
    if (!layout || !availableCharts || !Array.isArray(availableCharts)) return [];
    const ids = new Set<number>();
    layout.forEach((w) => {
      const chart = availableCharts.find((c) => c.id === w.chart_id);
      if (chart?.dataset_id) ids.add(chart.dataset_id);
    });
    return Array.from(ids);
  }, [layout, availableCharts]);

  // Helper to get chart type
  const getChartType = (chartId: number) => {
    if (!Array.isArray(availableCharts)) return undefined;
    return availableCharts?.find(c => c.id === chartId)?.chart_type;
  };

  // Helper to check if item is a layout element (not a chart)
  const isLayoutElement = (item: DashboardLayoutItem) => {
    if (item.widget_type) {
      return item.widget_type === 'header' || item.widget_type === 'text' || item.widget_type === 'divider' || item.widget_type === 'tabs';
    }
    // Fallback: check by title/content patterns for old data without widget_type
    const title = (item.title || '').toLowerCase();
    const chartType = getChartType(item.chart_id);
    return title === 'header' || title === 'text' || title === 'divider' || title === 'tabs container' || 
           title.startsWith('new header') || title.startsWith('text/') || title.startsWith('tab');
  };

  const removeWidget = (id: string) => {
    setLayout(prev => prev.filter(item => item.i !== id));
  };

  const updateWidgetContent = (id: string, newContent: string) => {
    setLayout(prev => prev.map(item => item.i === id ? { ...item, content: newContent } : item));
  };

  const updateWidgetStyleConfig = (id: string, styleConfig: DashboardLayoutItem['style_config']) => {
    setLayout(prev => prev.map(item => item.i === id ? { ...item, style_config: styleConfig } : item));
  };

  const openStyleEditor = (id: string) => {
    setSelectedWidgetId(id);
    setIsStyleEditorOpen(true);
  };

  const closeStyleEditor = () => {
    setSelectedWidgetId(null);
    setIsStyleEditorOpen(false);
  };

  const addChartsToDashboard = (charts: any[]) => {
    let currentMaxY = layout.length > 0 ? Math.max(...layout.map(l => l.y + l.h)) : 0;
    const newItems: DashboardLayoutItem[] = [];

    charts.forEach((chart, index) => {
      let w = 6;
      let h = 4;
      switch (chart.chart_type) {
        case 'kpi': w = 2; h = 2; break;
        case 'pie': w = 4; h = 3; break;
        case 'header': w = 12; h = 1; break;
        case 'divider': w = 12; h = 1; break;
        case 'text': w = 6; h = 2; break;
        case 'tabs': w = 12; h = 6; break;
        case 'bar':
        case 'line':
        case 'table': w = 6; h = 4; break;
        default: w = 6; h = 4; break;
      }

      const newItem: DashboardLayoutItem = {
        i: `n${Date.now() + index}`,
        x: (index * 6) % 12,
        y: currentMaxY,
        w,
        h,
        chart_id: chart.id,
        title: chart.title,
        widget_type: chart.widget_type || 'chart',
        content: chart.content || ''
      };
      
      if ((index * 6) % 12 === 0 && index > 0) {
        currentMaxY += h;
      }
      
      newItems.push(newItem);
    });

    setLayout(prev => [...prev, ...newItems]);
    setShowAddChart(false);
    toast.success(`${charts.length} item${charts.length > 1 ? 's' : ''} added to dashboard`);
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart3 size={16} />;
      case 'pie': return <PieChart size={16} />;
      case 'line': return <LineChart size={16} />;
      case 'kpi': return <TrendingUp size={16} />;
      case 'table': return <TableIcon size={16} />;
      default: return <BarChart3 size={16} />;
    }
  };

  // Initialize layout from dashboard data
  useEffect(() => {
    if (dashboard?.layout) {
      setLayout(Array.isArray(dashboard.layout) ? dashboard.layout : []);
    }
  }, [dashboard]);

  // Load default filters on mount
  useEffect(() => {
    if (dashboard && !hasLoadedDefaults) {
      let initialFilters: Record<string, any> = {};
      let appliedPreset = false;

      // Try loading from default preset first
      if (dashboard.filter_presets) {
        const defaultPreset = dashboard.filter_presets.find(p => p.is_default);
        if (defaultPreset && defaultPreset.state) {
          initialFilters = { ...defaultPreset.state };
          appliedPreset = true;
        }
      }

      // If no default preset was applied, apply individual filter default_values
      if (!appliedPreset && dashboard.filter_config) {
        dashboard.filter_config.forEach(f => {
          if (f.default_value) {
            const resolved = resolveDynamicVariables(f.default_value);
            if (f.type === 'select') {
              initialFilters[f.column] = resolved.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              initialFilters[f.column] = resolved;
            }
          }
        });
      }

      if (Object.keys(initialFilters).length > 0) {
        setGlobalFilters(initialFilters);
        setStagedFilters(initialFilters);
      }
      
      setHasLoadedDefaults(true);
    }
  }, [dashboard, hasLoadedDefaults]);

  const saveMutation = useMutation({
    mutationFn: (newLayout: DashboardLayoutItem[]) =>
      api.patch(`/api/dashboards/${id}`, { layout: newLayout }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', id] });
      setIsEditing(false);
      toast.success('Dashboard layout saved!');
    },
    onError: () => toast.error('Failed to save layout')
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => api.patch(`/api/dashboards/${id}`, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', id] });
      setIsSettingsOpen(false);
      toast.success('Dashboard settings updated!');
    },
    onError: () => toast.error('Failed to update settings')
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard deleted');
      navigate('/dashboards');
    },
    onError: () => toast.error('Failed to delete dashboard')
  });

  const favoriteMutation = useMutation({
    mutationFn: () => api.post(`/api/dashboards/${id}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
    onError: () => toast.error('Failed to update favorite status')
  });

  const toggleFavorite = () => {
    favoriteMutation.mutate();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Dashboard link copied to clipboard!');
  };

  const handleUpdateSettings = (newSettings: any) => {
    updateSettingsMutation.mutate(newSettings);
  };

  const handleLayoutChange = (newLayout: any[]) => {
    const updatedLayout = layout.map(item => {
      const matching = newLayout.find(l => l.i === item.i);
      return matching ? { ...item, x: matching.x, y: matching.y, w: matching.w, h: matching.h } : item;
    });
    setLayout(updatedLayout);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }
    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name: newViewName.trim(),
      is_default: newViewIsDefault,
      state: globalFilters,
      drill_stacks: saveDrillFilters ? chartsDrillStacks : undefined
    };

    let updatedPresets = [...(dashboard?.filter_presets || [])];
    
    // If setting as default, unset others
    if (newViewIsDefault) {
      updatedPresets = updatedPresets.map(p => ({ ...p, is_default: false }));
    }
    
    updatedPresets.push(newPreset);
    
    updateSettingsMutation.mutate({ filter_presets: updatedPresets });
    setIsSaveViewModalOpen(false);
    setNewViewName('');
    setNewViewIsDefault(false);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    setGlobalFilters(preset.state);
    setStagedFilters(preset.state);
    setIsSavedViewsOpen(false);
    
    if (preset.drill_stacks) {
      setRestoreDrillAction({ stacks: preset.drill_stacks, timestamp: Date.now() });
    } else {
      setRestoreDrillAction({ stacks: {}, timestamp: Date.now() });
    }
    
    toast.success(`Applied view: ${preset.name}`);
  };

  const handleDeletePreset = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    const updatedPresets = (dashboard?.filter_presets || []).filter(p => p.id !== presetId);
    updateSettingsMutation.mutate({ filter_presets: updatedPresets });
  };



  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={48} />
      </div>
    );
  }

  const headerIconStyle = { color: displayDashboard?.icon_color || displayDashboard?.text_color || '#64748b' };
  const headerIconClass = "p-1.5 rounded-lg transition-all opacity-70 hover:opacity-100 hover:bg-slate-500/10 active:scale-95";

  return (
    <div ref={dashboardRef} className="flex flex-col h-full bg-slate-50 font-sans" style={{ fontFamily: 'sans-serif' }}>
      {/* Dashboard Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b border-slate-150 shadow-sm z-30 sticky top-0 backdrop-blur-md"
        style={{
          backgroundColor: displayDashboard?.background_color ? `${displayDashboard.background_color}ee` : '#ffffffdd',
          borderColor: displayDashboard?.background_color ? 'transparent' : undefined
        }}
      >
        {/* Left Side: Title, Subtitle, Logo & Badges */}
        <div className="flex items-center gap-3">
          {displayDashboard?.logo_url && (
            <img
              src={displayDashboard.logo_url}
              alt="Logo"
              className="w-auto object-contain rounded-sm transition-all duration-200"
              style={{
                height: displayDashboard.logo_size === 'small'
                  ? '20px'
                  : displayDashboard.logo_size === 'large'
                    ? '40px'
                    : '28px'
              }}
            />
          )}
          <div className="flex flex-col justify-center">
            <h1
              className="font-semibold tracking-tight cursor-default flex items-center gap-2 leading-none transition-all duration-200"
              style={{
                color: displayDashboard?.text_color || '#2c3e50',
                fontSize: `${displayDashboard?.title_font_size || 15}px`
              }}
            >
              {displayDashboard?.title || 'Loading...'}
              {isEditing && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 animate-pulse ml-2">
                  Edit Mode
                </span>
              )}
            </h1>
            {displayDashboard?.description && (
              <span
                className="font-medium tracking-wide mt-0.5 transition-all duration-200"
                style={{
                  color: displayDashboard?.description_color || (displayDashboard?.text_color ? `${displayDashboard.text_color}b3` : '#64748b'),
                  fontSize: `${displayDashboard?.subtitle_font_size || 10}px`
                }}
              >
                {displayDashboard.description}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Actions list or Editing panel */}
        <div className="flex items-center gap-2">
          {isEditing && isOwner ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <button
                onClick={() => setShowAddChart(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
              >
                <Plus size={14} /> Add Widget
              </button>
              <button
                onClick={() => saveMutation.mutate(layout)}
                disabled={saveMutation.isPending}
                className="bg-brand text-white px-4 py-1.5 border border-brand rounded-md text-xs font-bold shadow-sm hover:bg-brand-dark transition transform active:scale-95 flex items-center gap-1.5"
              >
                <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save Layout'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              
              {/* Primary Actions */}
              {isOwner && (
                <button
                  onClick={() => setIsEditing(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 mr-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-bold transition-all shadow-sm ${isMobile ? 'hidden' : ''}`}
                  title="Edit Layout"
                >
                  <Maximize2 size={13} /> Edit Layout
                </button>
              )}

              <button
                onClick={() => setIsAIDrawerOpen(true)}
                className={`flex items-center justify-center mr-1 rounded-md font-bold transition-all shadow-sm border hover:shadow-md ${isMobile ? 'p-1.5' : 'gap-1.5 px-3 py-1.5 text-xs'}`}
                style={{
                  color: displayDashboard?.icon_color || '#3b82f6',
                  backgroundColor: displayDashboard?.icon_color ? `${displayDashboard.icon_color}1a` : '#eff6ff',
                  borderColor: displayDashboard?.icon_color ? `${displayDashboard.icon_color}33` : '#bfdbfe',
                }}
                title="AI Assistant"
              >
                <Sparkles size={isMobile ? 15 : 13} className="animate-pulse" /> {!isMobile && 'AI Assistant'}
              </button>

              {!isMobile && <div className="h-5 w-[1px] bg-slate-200 mx-1" />}

              {/* Utility Icons */}
              {!isMobile && (
                <>
                  {/* Global History Navigation */}
                  <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md p-0.5 shadow-sm mr-1">
                    <button
                      onClick={handleGlobalGoBack}
                      disabled={!canGoBack}
                      className={`p-1 rounded transition-colors ${canGoBack ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                      title="Undo Action (Go Back)"
                    >
                      <Undo2 size={15} />
                    </button>
                    <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
                    <button
                      onClick={handleGlobalGoForward}
                      disabled={!canGoForward}
                      className={`p-1 rounded transition-colors ${canGoForward ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                      title="Redo Action (Go Forward)"
                    >
                      <Redo2 size={15} />
                    </button>
                    <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
                    <button
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['charts'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboards', id] });
                        toast.success('Dashboard refreshed');
                      }}
                      className="p-1 rounded transition-colors text-slate-600 hover:bg-slate-100"
                      title="Refresh Dashboard"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>

                  <button
                    onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                    className={`${headerIconClass} ${isFilterBarOpen ? 'bg-black/5 dark:bg-white/10 !opacity-100' : ''}`}
                    style={headerIconStyle}
                    title="Toggle Filters"
                  >
                    <Filter size={15} />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setIsInfoOpen(!isInfoOpen)}
                      className={`${headerIconClass} ${isInfoOpen ? 'bg-black/5 dark:bg-white/10 !opacity-100' : ''}`}
                      style={headerIconStyle}
                      title="Dashboard Details"
                    >
                      <Info size={15} />
                    </button>
                    {isInfoOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsInfoOpen(false)} />
                        <div className="absolute right-0 mt-1.5 w-72 bg-white/95 backdrop-blur-md border border-slate-150 rounded-xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-200 text-slate-700 text-xs">
                          <h4 className="font-bold text-slate-800 text-[13px] mb-1">{displayDashboard?.title}</h4>
                          <p className="text-slate-500 leading-relaxed font-medium text-[11px] mb-3">
                            {displayDashboard?.description || 'No description provided for this dashboard.'}
                          </p>
                          <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <div className="flex justify-between">
                              <span>Owner</span>
                              <span className="text-slate-600 truncate max-w-[120px] font-medium">{dashboard?.owner_name || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Grid Columns</span>
                              <span className="text-slate-600">{dashboard?.grid_cols || 12} Columns</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Layout Widgets</span>
                              <span className="text-slate-600">{dashboard?.layout?.length || 0} Widgets</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsRefreshOpen(!isRefreshOpen)}
                      className={`${headerIconClass} ${refreshInterval ? '!text-blue-500 bg-blue-50' : ''}`}
                      style={refreshInterval || isRefreshOpen ? undefined : headerIconStyle}
                      title="Auto Refresh Settings"
                    >
                      <Clock size={15} />
                    </button>
                    {isRefreshOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsRefreshOpen(false)} />
                        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-150 rounded-xl shadow-xl py-1.5 z-50 text-[11px] font-semibold text-slate-600 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-50 mb-1">
                            Auto Refresh
                          </div>
                          {[
                            { label: 'Manual Refresh Only', value: false },
                            { label: 'Every 10 Seconds', value: 10000 },
                            { label: 'Every 30 Seconds', value: 30000 },
                            { label: 'Every 1 Minute', value: 60000 },
                            { label: 'Every 5 Minutes', value: 300000 },
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setRefreshInterval(item.value as number | false);
                                setIsRefreshOpen(false);
                                if (item.value === false) {
                                  toast.success('Auto refresh disabled');
                                } else {
                                  toast.success(`Refreshes every ${item.label.split('Every ')[1]}`);
                                }
                              }}
                              className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors ${refreshInterval === item.value ? 'text-brand bg-brand/5 font-bold' : ''}`}
                            >
                              {item.label}
                              {refreshInterval === item.value && <div className="w-1.5 h-1.5 bg-brand rounded-full" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={toggleFavorite}
                    className={`${headerIconClass} ${dashboard?.is_favorite ? '!text-indigo-600' : ''}`}
                    style={dashboard?.is_favorite ? undefined : headerIconStyle}
                    title={dashboard?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    disabled={favoriteMutation.isPending}
                  >
                    <Bookmark
                      size={15}
                      className={dashboard?.is_favorite ? 'fill-indigo-600' : ''}
                    />
                  </button>
                </>
              )}

              {/* More Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`${headerIconClass} ${isMoreOpen ? 'bg-black/5 dark:bg-white/10 !opacity-100' : ''}`}
                  style={headerIconStyle}
                  title="More actions"
                >
                  <MoreHorizontal size={15} />
                </button>
                {isMoreOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-150 rounded-xl shadow-xl py-2 z-50 text-[11px] font-semibold text-slate-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      
                      {/* Mobile Only Items */}
                      {isMobile && (
                        <>
                          {isOwner && (
                            <button onClick={() => { setIsEditing(true); setIsMoreOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"><Maximize2 size={13} className="text-slate-400" /> Edit Layout</button>
                          )}
                          <button onClick={() => { setIsFilterBarOpen(!isFilterBarOpen); setIsMoreOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"><Filter size={13} className="text-slate-400" /> Toggle Filters</button>
                          <button onClick={() => { toggleFavorite(); setIsMoreOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"><Bookmark size={13} className="text-slate-400" /> {dashboard?.is_favorite ? 'Remove Favorite' : 'Add Favorite'}</button>
                          <div className="border-t border-slate-50 my-1" />
                        </>
                      )}

                      <button
                        onClick={() => {
                          handleShare();
                          setIsMoreOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                      >
                        <ExternalLink size={13} className="text-slate-400" />
                        Share Dashboard
                      </button>

                      <button
                        onClick={() => {
                          toggleFullScreen();
                          setIsMoreOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Maximize2 size={13} className="text-slate-400" />
                        {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                      </button>

                      {isOwner && (
                        <>
                          <div className="border-t border-slate-50 my-1" />
                          <button
                            onClick={() => {
                              setIsFiltersPanelOpen(true);
                              setIsMoreOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                          >
                            <Filter size={13} className="text-slate-400" />
                            Manage Quick Filters
                          </button>
                          <button
                            onClick={() => {
                              setIsSettingsOpen(true);
                              setIsMoreOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                          >
                            <Settings size={13} className="text-slate-400" />
                            Dashboard Settings
                          </button>
                          <div className="border-t border-slate-50 my-1" />
                          <button
                            onClick={() => {
                              setIsDeleteDialogOpen(true);
                              setIsMoreOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-500 flex items-center gap-2.5 transition-colors"
                          >
                            <Trash2 size={13} />
                            Delete Dashboard
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metabase-Style Filter Bar */}
      {isFilterBarOpen && (
        <div
          className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300 sticky top-[57px] z-20"
        >
          <div className="flex flex-wrap items-center gap-3 w-full">
          {(dashboard?.filter_config || []).length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 w-full">
              {(dashboard?.filter_config || []).map((f: any) => (
                <DashboardFilter
                  key={f.id}
                  filter={f}
                  stagedFilters={stagedFilters}
                  setStagedFilters={setStagedFilters}
                  openFilterId={openFilterId}
                  setOpenFilterId={setOpenFilterId}
                  isMobile={isMobile}
                  allFilters={dashboard?.filter_config || []}
                />
              ))}
              
              {/* Reset All Filters Button */}
              {Object.keys(stagedFilters).filter(k => stagedFilters[k] !== undefined && stagedFilters[k] !== '' && (!Array.isArray(stagedFilters[k]) || stagedFilters[k].length > 0)).length > 0 && (
                <button
                  onClick={() => {
                    setStagedFilters({});
                    setGlobalFilters({});
                    setOpenFilterId(null);
                    toast.success('All filters reset');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all uppercase tracking-wider ml-2"
                >
                  <FilterX size={12} /> Reset
                </button>
              )}

              {/* Apply Filters Button */}
              {JSON.stringify(stagedFilters) !== JSON.stringify(globalFilters) && (
                <button
                  onClick={() => {
                    setGlobalFilters(stagedFilters);
                    toast.success('Filters applied');
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm transition-all uppercase tracking-wider ml-2 animate-in zoom-in"
                >
                  Apply Filters
                </button>
              )}
              
              <div className="flex-1" />

              {/* Saved Views Dropdown */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setIsSavedViewsOpen(!isSavedViewsOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${isSavedViewsOpen ? 'bg-brand/10 text-brand border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'}`}
                >
                  <Bookmark size={14} className={isSavedViewsOpen ? 'fill-brand' : ''} />
                  Saved Views
                  <ChevronDown size={14} className={`transition-transform ${isSavedViewsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSavedViewsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSavedViewsOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-150 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200 text-xs">
                      <div className="px-3 pb-2 mb-2 border-b border-slate-100 font-extrabold text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Filter Presets</span>
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 px-1.5">
                        {!(dashboard?.filter_presets?.length) ? (
                          <div className="py-4 text-center text-slate-400 italic font-medium px-2">No saved views yet.</div>
                        ) : (
                          dashboard.filter_presets.map((preset) => (
                            <div
                              key={preset.id}
                              onClick={() => handleApplyPreset(preset)}
                              className="group w-full text-left px-2.5 py-2 hover:bg-brand/5 hover:text-brand rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="font-bold text-slate-700 group-hover:text-brand truncate">{preset.name}</span>
                                {preset.is_default && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest shrink-0">Default</span>
                                )}
                              </div>
                              <button
                                onClick={(e) => handleDeletePreset(e, preset.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                                title="Delete preset"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {Object.keys(globalFilters).length > 0 && (
                        <div className="px-1.5 mt-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setIsSavedViewsOpen(false);
                              setIsSaveViewModalOpen(true);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-brand/10 text-brand rounded-lg font-bold transition-colors"
                          >
                            <Save size={13} /> Save Current Filters
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic font-medium py-1">No active filters. Click "Manage Filters" to configure your dashboard controls.</span>
          )}
          </div>
        </div>
      )}

      {/* Drill Filter Bar Portal Target */}
      <div id="drill-bar-portal" className="flex flex-wrap items-center gap-2 px-4 bg-slate-50 border-slate-100 empty:hidden z-10 sticky top-[57px] backdrop-blur-sm shadow-sm py-2 border-b"></div>

      {/* Grid Container */}
      <div
        className={`flex-1 min-h-[70vh] overflow-auto custom-scrollbar transition-colors duration-500 ${isEditing ? 'bg-slate-50 border-2 border-dashed border-slate-200 m-4 rounded-xl' : ''}`}
        style={isEditing ? {
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: `calc(100% / ${dashboard?.grid_cols || 12}) ${(dashboard?.row_height || 80) + (dashboard?.grid_gap ?? 16)}px`,
          backgroundPosition: `0px 0px`
        } : {}}
      >
        {(() => {
          const missingRequiredFilters = (dashboard?.filter_config || []).filter(
            (f) => f.is_required && (globalFilters[f.column] === undefined || globalFilters[f.column] === '' || (Array.isArray(globalFilters[f.column]) && globalFilters[f.column].length === 0))
          );
          
          if (missingRequiredFilters.length > 0 && !isEditing) {
            return (
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh] animate-in zoom-in-95 duration-500">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-full mb-4 shadow-sm shadow-amber-500/10">
                  <Filter size={32} className="text-amber-500 stroke-[2]" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Filters Required</h3>
                <p className="text-sm text-slate-500 max-w-md text-center mb-6">
                  Please select values for the following required filters to view this dashboard:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                  {missingRequiredFilters.map(f => (
                    <span key={f.id} className="px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-700 shadow-sm">
                      {f.label || f.column}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return isMobile && !isEditing ? (
            <div className="flex flex-col gap-6 p-4 max-w-full">
            {sortedMobileLayout.map((item) => {
              const chartType = getChartType(item.chart_id);
              const isKPI = chartType === 'kpi';

              return (
                <div
                  key={item.i}
                  className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col w-full"
                  style={{ height: isKPI ? '140px' : '360px' }}
                >
                  <div className={`flex-1 min-h-0 ${isKPI ? 'flex items-center justify-center' : ''}`}>
                    {item.widget_type === 'header' ? (
                      <div 
                        className="w-full h-full flex items-center px-4" 
                        style={{ 
                          ...applyLayoutStyle(
                            item.style_config, 
                            { fontSize: '1.25rem', fontWeight: 'bold' },
                            { 
                              text_color: displayDashboard?.text_color,
                              background_color: displayDashboard?.background_color,
                              title_font_size: displayDashboard?.title_font_size,
                              subtitle_font_size: displayDashboard?.subtitle_font_size,
                              echarts_theme: displayDashboard?.echarts_theme
                            }
                          ),
                          justifyContent: item.style_config?.text_alignment === 'center' ? 'center' : 
                                         item.style_config?.text_alignment === 'right' ? 'flex-end' : 
                                         item.style_config?.text_alignment === 'justify' ? 'space-between' : 
                                         'flex-start'
                        }}
                      >
                        <h2 style={{ margin: 0, color: 'inherit', fontFamily: 'inherit', textAlign: item.style_config?.text_alignment || 'inherit' }}>
                          {item.content || 'Header'}
                        </h2>
                      </div>
                    ) : item.widget_type === 'divider' ? (
                      <div className="w-full h-full flex items-center justify-center px-6">
                        <div 
                          className="w-full h-px rounded-full" 
                          style={{ 
                            backgroundColor: item.style_config?.background_color || displayDashboard?.text_color || '#cbd5e1',
                            opacity: item.style_config?.is_transparent ? 0 : 1
                          }} 
                        />
                      </div>
                    ) : item.widget_type === 'text' ? (
                      <div 
                        className="w-full h-full overflow-auto p-4 custom-scrollbar" 
                        style={applyLayoutStyle(
                          item.style_config, 
                          { fontSize: '0.875rem' },
                          { 
                            text_color: displayDashboard?.text_color,
                            background_color: displayDashboard?.background_color,
                            title_font_size: displayDashboard?.title_font_size,
                            subtitle_font_size: displayDashboard?.subtitle_font_size,
                            echarts_theme: displayDashboard?.echarts_theme
                          }
                        )}
                      >
                        <div className="prose prose-sm max-w-none" style={{ color: 'inherit', fontFamily: 'inherit', textAlign: 'inherit' }}>
                          <ReactMarkdown>{item.content || '*Empty text*'}</ReactMarkdown>
                        </div>
                      </div>
                    ) : item.widget_type === 'tabs' ? (
                      <DashboardTabsWidget
                        content={item.content || ''}
                        isEditing={false}
                        onUpdateContent={(content) => updateWidgetContent(item.i, content)}
                        availableCharts={availableCharts || []}
                        globalFilters={effectiveFilters}
                        refreshInterval={refreshInterval}
                        theme={displayDashboard?.echarts_theme}
                        styleConfig={item.style_config}
                        onDrillFiltersChange={handleWidgetDrillFiltersChange}
                        dashboardTheme={{
                          text_color: displayDashboard?.text_color,
                          background_color: displayDashboard?.background_color,
                          title_font_size: displayDashboard?.title_font_size,
                          subtitle_font_size: displayDashboard?.subtitle_font_size,
                          echarts_theme: displayDashboard?.echarts_theme,
                          themeMeta: extractThemeMeta(displayDashboard?.echarts_theme, dbThemes || [], {
                            background_color: displayDashboard?.background_color,
                            text_color: displayDashboard?.text_color
                          })
                        }}
                        restoreDrillAction={restoreDrillAction ? { stack: restoreDrillAction.stacks[item.chart_id] || [], timestamp: restoreDrillAction.timestamp } : undefined}
                      />
                    ) : isLayoutReady ? (
                      <DashboardWidget
                        chartId={item.chart_id}
                        filters={Object.fromEntries(Object.entries(effectiveFilters).filter(([_, v]) => v !== undefined && v !== ''))}
                        refetchInterval={refreshInterval}
                        theme={displayDashboard?.echarts_theme}
                        dashboardId={dashboard?.id}
                        dashboardName={dashboard?.title}
                        onDrillFiltersChange={(drillFilters, drillStack) => handleWidgetDrillFiltersChange(item.chart_id, drillFilters, drillStack)}
                        restoreDrillAction={restoreDrillAction ? { stack: restoreDrillAction.stacks[item.chart_id] || [], timestamp: restoreDrillAction.timestamp } : undefined}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 animate-pulse">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-brand animate-spin mb-3"></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimizing View...</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layout={layout}
            cols={dashboard?.grid_cols || 12}
            rowHeight={dashboard?.row_height || 80}
            compactType={null}
            preventCollision={true}
            isDraggable={isEditing}
            isResizable={isEditing}
            draggableHandle=".drag-handle"
            onLayoutChange={handleLayoutChange}
            margin={[dashboard?.grid_gap ?? 16, dashboard?.grid_gap ?? 16]}
          >
            {layout.map((item) => {
              const chartType = getChartType(item.chart_id);
              const isKPI = chartType === 'kpi';

              return (
                <div
                  key={item.i}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col group transition-shadow ${isEditing ? 'cursor-grab active:cursor-grabbing hover:shadow-md border-slate-300' : 'border-slate-200'
                    }`}
                >
                  {isEditing && (
                    <div className={`drag-handle flex items-center justify-between px-4 py-2 border-b border-slate-100 cursor-grab active:cursor-grabbing ${isKPI ? 'bg-amber-50/50' : 'bg-slate-50/50'}`}>
                      <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400">
                          {getChartIcon(chartType || 'bar')}
                        </div>
                        <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-wider truncate">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
                        {/* Style button for layout elements */}
                        {isLayoutElement(item) && (
                          <button
                            onClick={() => openStyleEditor(item.i)}
                            title="Style Widget"
                            className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all"
                          >
                            <Palette size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => window.open(chartType === 'custom_template' ? `/charts/playground?id=${item.chart_id}` : `/charts/${item.chart_id}`, '_blank')}
                          title="Edit Source"
                          className="p-1.5 text-slate-400 hover:text-brand hover:bg-white rounded-lg transition-all"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          onClick={() => removeWidget(item.i)}
                          title="Remove"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className={`flex-1 min-h-0 ${isKPI && !isEditing ? 'flex items-center justify-center' : ''}`}>
                    {item.widget_type === 'header' ? (
                      <div 
                        className="w-full h-full flex items-center px-4" 
                        onMouseDown={e => { if (isEditing) e.stopPropagation(); }}
                        style={{ 
                          ...applyLayoutStyle(
                            item.style_config, 
                            { fontSize: '1.5rem', fontWeight: 'bold' },
                            { 
                              text_color: displayDashboard?.text_color,
                              background_color: displayDashboard?.background_color,
                              title_font_size: displayDashboard?.title_font_size,
                              subtitle_font_size: displayDashboard?.subtitle_font_size,
                              echarts_theme: displayDashboard?.echarts_theme
                            }
                          ),
                          justifyContent: item.style_config?.text_alignment === 'center' ? 'center' : 
                                         item.style_config?.text_alignment === 'right' ? 'flex-end' : 
                                         item.style_config?.text_alignment === 'justify' ? 'space-between' : 
                                         'flex-start'
                        }}
                      >
                        {isEditing ? (
                          <input 
                            value={item.content || ''} 
                            onChange={(e) => updateWidgetContent(item.i, e.target.value)} 
                            placeholder="Header Title"
                            className="w-full bg-transparent outline-none border-b border-transparent focus:border-brand transition-colors"
                            style={{ 
                              fontSize: 'inherit', 
                              fontWeight: 'inherit', 
                              color: 'inherit', 
                              fontFamily: 'inherit',
                              textAlign: item.style_config?.text_alignment || 'left'
                            }}
                          />
                        ) : (
                          <h2 style={{ margin: 0, color: 'inherit', fontFamily: 'inherit', textAlign: item.style_config?.text_alignment || 'left' }}>
                            {item.content || 'Header'}
                          </h2>
                        )}
                      </div>
                    ) : item.widget_type === 'divider' ? (
                      <div className="w-full h-full flex items-center justify-center px-6">
                        <div 
                          className="w-full h-px rounded-full" 
                          style={{ 
                            backgroundColor: item.style_config?.background_color || displayDashboard?.text_color || '#cbd5e1',
                            opacity: item.style_config?.is_transparent ? 0 : 1
                          }} 
                        />
                      </div>
                    ) : item.widget_type === 'text' ? (
                      <div 
                        className="w-full h-full overflow-auto p-4 custom-scrollbar" 
                        onMouseDown={e => { if (isEditing) e.stopPropagation(); }}
                        style={applyLayoutStyle(item.style_config, { 
                          fontSize: '0.875rem' 
                        })}
                      >
                        {isEditing ? (
                          <textarea 
                            value={item.content || ''} 
                            onChange={(e) => updateWidgetContent(item.i, e.target.value)} 
                            placeholder="Enter Markdown text..."
                            className="w-full h-full bg-slate-50/50 outline-none border border-transparent focus:border-brand rounded-lg p-2 resize-none"
                            style={{ 
                              fontSize: 'inherit', 
                              color: 'inherit', 
                              fontFamily: 'inherit', 
                              textAlign: 'inherit'
                            }}
                          />
                        ) : (
                          <div className="prose prose-sm max-w-none" style={{ color: 'inherit', fontFamily: 'inherit', textAlign: 'inherit' }}>
                            <ReactMarkdown>{item.content || '*Empty text*'}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ) : item.widget_type === 'tabs' ? (
                      <DashboardTabsWidget
                        content={item.content || ''}
                        isEditing={isEditing}
                        onUpdateContent={(content) => updateWidgetContent(item.i, content)}
                        availableCharts={availableCharts || []}
                        globalFilters={effectiveFilters}
                        refreshInterval={refreshInterval}
                        theme={displayDashboard?.echarts_theme}
                        styleConfig={item.style_config}
                        onDrillFiltersChange={handleWidgetDrillFiltersChange}
                        dashboardTheme={{
                          text_color: displayDashboard?.text_color,
                          background_color: displayDashboard?.background_color,
                          title_font_size: displayDashboard?.title_font_size,
                          subtitle_font_size: displayDashboard?.subtitle_font_size,
                          echarts_theme: displayDashboard?.echarts_theme,
                          themeMeta: extractThemeMeta(displayDashboard?.echarts_theme, dbThemes || [], {
                            background_color: displayDashboard?.background_color,
                            text_color: displayDashboard?.text_color
                          })
                        }}
                        restoreDrillAction={restoreDrillAction ? { stack: restoreDrillAction.stacks[item.chart_id] || [], timestamp: restoreDrillAction.timestamp } : undefined}
                      />
                    ) : isLayoutReady ? (
                      <DashboardWidget
                        chartId={item.chart_id}
                        filters={Object.fromEntries(Object.entries(effectiveFilters).filter(([_, v]) => v !== undefined && v !== ''))}
                        refetchInterval={refreshInterval}
                        theme={displayDashboard?.echarts_theme}
                        dashboardId={dashboard?.id}
                        dashboardName={dashboard?.title}
                        onDrillFiltersChange={(drillFilters, drillStack) => handleWidgetDrillFiltersChange(item.chart_id, drillFilters, drillStack)}
                        restoreDrillAction={restoreDrillAction ? { stack: restoreDrillAction.stacks[item.chart_id] || [], timestamp: restoreDrillAction.timestamp } : undefined}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 animate-pulse rounded-b-xl">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-brand animate-spin mb-3"></div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimizing View...</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </ResponsiveGridLayout>
          );
        })()}

        {!isLoading && layout.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
            <LayoutDashboard size={64} className="mb-4 opacity-20" />
            <p className="font-medium">Empty Dashboard</p>
            <p className="text-sm mb-4">Add some charts to get started</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-brand font-bold hover:underline"
            >
              Enter Edit Mode
            </button>
          </div>
        )}
      </div>

      <SelectChartModal
        isOpen={showAddChart}
        onClose={() => setShowAddChart(false)}
        multiSelect={true}
        onSelectCharts={addChartsToDashboard}
      />

      {/* Save View Modal */}
      {isSaveViewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Save Filter View</h3>
              <button onClick={() => setIsSaveViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">View Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newViewName}
                  onChange={e => setNewViewName(e.target.value)}
                  placeholder="e.g. Q1 2026 Region Sales"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newViewIsDefault ? 'bg-brand border-brand' : 'bg-white border-slate-300 group-hover:border-brand'}`}>
                  {newViewIsDefault && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={newViewIsDefault}
                  onChange={e => setNewViewIsDefault(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">Set as default for this dashboard</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${saveDrillFilters ? 'bg-brand border-brand' : 'bg-white border-slate-300 group-hover:border-brand'}`}>
                  {saveDrillFilters && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={saveDrillFilters}
                  onChange={e => setSaveDrillFilters(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">Include drill filters</span>
              </label>
              
              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Filters to be saved:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(globalFilters).map(([k, v]) => {
                    const filterDef = dashboard?.filter_config?.find(f => f.column === k);
                    const label = filterDef ? filterDef.label : k;
                    const val = Array.isArray(v) ? v.join(', ') : v;
                    return (
                      <span key={k} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 font-medium shadow-sm">
                        <span className="text-slate-400 font-normal mr-1">{label}:</span>{val}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsSaveViewModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                disabled={!newViewName.trim() || updateSettingsMutation.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {updateSettingsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {dashboard && (
        <DashboardFiltersPanel
          isOpen={isFiltersPanelOpen}
          onClose={() => setIsFiltersPanelOpen(false)}
          filters={dashboard.filter_config || []}
          onSave={(newFilters) => {
            handleUpdateSettings({ filter_config: newFilters });
            setIsFiltersPanelOpen(false);
          }}
        />
      )}

      {/* Settings Panel */}
      {displayDashboard && (
        <DashboardSettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            setPreviewSettings(null);
          }}
          onChange={setPreviewSettings}
          settings={{
            id: displayDashboard.id,
            title: displayDashboard.title,
            description: displayDashboard.description || '',
            background_color: displayDashboard.background_color || '#f8fafc',
            text_color: displayDashboard.text_color || '#0f172a',
            description_color: displayDashboard.description_color || '#64748b',
            icon_color: displayDashboard.icon_color || '',
            title_font_size: displayDashboard.title_font_size ?? 15,
            subtitle_font_size: displayDashboard.subtitle_font_size ?? 10,
            logo_size: displayDashboard.logo_size || 'medium',
            filter_config: displayDashboard.filter_config || [],
            logo_url: displayDashboard.logo_url || '',
            grid_gap: displayDashboard.grid_gap ?? 16,
            grid_cols: displayDashboard.grid_cols ?? 12,
            row_height: displayDashboard.row_height ?? 80,
            role_ids: displayDashboard.role_ids || [],
            co_owner_ids: displayDashboard.co_owners?.map((u: any) => u.id) || [],
            echarts_theme: displayDashboard.echarts_theme || 'default',
            llm_config: displayDashboard.llm_config || {},
            cache_config: displayDashboard.cache_config || {}
          }}
          onSave={(settings) => { handleUpdateSettings(settings) }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Dashboard"
        message="Are you sure you want to delete the dashboard"
        itemName={dashboard?.title}
        isLoading={deleteMutation.isPending}
        requireTypeConfirm={true}
      />

      {/* Widget Style Editor Modal */}
      {isStyleEditorOpen && selectedWidgetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Palette size={18} className="text-purple-500" />
                Style Widget
              </h3>
              <button onClick={closeStyleEditor} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <WidgetStyleEditor
                styleConfig={layout.find(item => item.i === selectedWidgetId)?.style_config}
                onChange={(styleConfig) => updateWidgetStyleConfig(selectedWidgetId, styleConfig)}
                onClose={closeStyleEditor}
              />
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={closeStyleEditor}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveMutation.mutate(layout);
                  closeStyleEditor();
                }}
                disabled={saveMutation.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardAIChat 
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        dashboardName={displayDashboard?.title || 'Dashboard'}
        contextDatasetIds={contextDatasetIds}
        llmConfigOverride={displayDashboard?.llm_config}
      />
    </div>
  );
};

export default DashboardViewPage;
