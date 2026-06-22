import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles, Plus, Trash2, Loader2, Send, Bot, Layout, ArrowRight,
  Database, Eye, ExternalLink, RefreshCw, LayoutGrid, Check, Layers, X,
  Settings, Grid, Sliders, AlertTriangle, PanelLeftClose, PanelLeftOpen, FilterX, ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLOBStore } from '../../store/useLOBStore';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { useStreamingChat } from '../ai/hooks/useStreamingChat';
import DashboardWidget from '../dashboards/DashboardWidget';
import DashboardFilter from '../dashboards/DashboardFilter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { MARKDOWN_COMPONENTS } from '../ai/components/AIStreamingBlock';
import RGL, { WidthProvider } from 'react-grid-layout/legacy';

const ResponsiveGridLayout = WidthProvider(RGL);

interface ChatSession {
  id: string;
  title: string;
  bot_id: string;
  dashboard_id: number | null;
  created_at: string;
  updated_at: string;
  messages: Array<{
    id: number;
    role: string;
    content: string;
    reasoning_content?: string;
    tool_calls?: any;
    tool_results?: any;
  }>;
}

interface Dataset {
  id: number;
  name: string;
  description?: string;
}

interface LLMConfig {
  base_url: string;
  api_key: string;
  model_name: string;
  api_type: string;
  headers?: string;
}

const GenieWorkspacePage: React.FC = () => {
  const queryClient = useQueryClient();
  const activeLOB = useLOBStore((state: any) => state.activeLOB);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Space creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<number[]>([]);
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);

  // LLM Config modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('genie_llm_config');
    return saved ? JSON.parse(saved) : {
      base_url: '',
      api_key: '',
      model_name: 'gpt-4o',
      api_type: 'chat_completions',
      headers: ''
    };
  });

  // Local storage dataset persistence helper
  const getStoredDatasets = (sessId: string): number[] => {
    const saved = localStorage.getItem(`genie_datasets_${sessId}`);
    return saved ? JSON.parse(saved) : [];
  };

  const storeDatasets = (sessId: string, ids: number[]) => {
    localStorage.setItem(`genie_datasets_${sessId}`, JSON.stringify(ids));
  };

  // Fetch all datasets
  const { data: datasets = [] } = useQuery<Dataset[]>({
    queryKey: ['genie-datasets', activeLOB?.id],
    queryFn: async () => {
      const response = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } });
      return response.data;
    }
  });

  // Fetch Genie sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<ChatSession[]>({
    queryKey: ['genie-sessions'],
    queryFn: async () => {
      const response = await api.get('/api/ai/sessions');
      return response.data.filter((s: any) => s.bot_id === 'dashboard');
    }
  });

  // Fetch active session detail
  const { data: currentSession, refetch: refetchCurrentSession } = useQuery<ChatSession>({
    queryKey: ['genie-sessions', currentSessionId],
    queryFn: async () => {
      const response = await api.get(`/api/ai/sessions/${currentSessionId}`);
      return response.data;
    },
    enabled: !!currentSessionId
  });

  // Fetch linked dashboard
  const dashboardId = currentSession?.dashboard_id;
  const { data: dashboard, refetch: refetchDashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['genie-dashboard', dashboardId],
    queryFn: async () => {
      const response = await api.get(`/api/dashboards/${dashboardId}`);
      return response.data;
    },
    enabled: !!dashboardId
  });

  // Track drill filters applied by each chart widget (key: chartId)
  const [chartsDrillFilters, setChartsDrillFilters] = useState<Record<number, Record<string, string | string[]>>>({});
  const [chartsDrillStacks, setChartsDrillStacks] = useState<Record<number, any[]>>({});

  // Track global dashboard filters
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [stagedFilters, setStagedFilters] = useState<Record<string, any>>({});
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);
  
  // Basic mobile check for the filter dropdown positioning
  const isMobile = window.innerWidth < 768;

  const handleWidgetDrillFiltersChange = useCallback((chartId: number, drillFilters: Record<string, string | string[]>, drillStack?: any[]) => {
    setChartsDrillFilters(prev => {
      if (!drillFilters || Object.keys(drillFilters).length === 0) {
        const copy = { ...prev };
        delete copy[chartId];
        return copy;
      }
      return { ...prev, [chartId]: drillFilters };
    });
    setChartsDrillStacks(prev => {
      if (!drillStack || drillStack.length === 0) {
        const copy = { ...prev };
        delete copy[chartId];
        return copy;
      }
      return { ...prev, [chartId]: drillStack };
    });
  }, []);

  const mergedFilters = useMemo(() => {
    const children: any[] = [];

    // Add global filters
    Object.entries(globalFilters).forEach(([col, filterLevels]) => {
      if (filterLevels !== undefined && filterLevels !== null && filterLevels !== '') {
        const levels = Array.isArray(filterLevels) ? filterLevels : [filterLevels];
        if (levels.length > 0) {
          children.push({
            type: 'rule',
            column_name: col,
            operator: levels.length > 1 ? 'IN' : 'EQUALS',
            value: levels.length > 1 ? levels : levels[0]
          });
        }
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
      children: children
    };
  }, [chartsDrillFilters, globalFilters]);

  // Active dataset IDs linked to this session
  const activeDatasetIds = useMemo(() => {
    if (dashboard?.llm_config?.dataset_ids?.length) {
      return dashboard.llm_config.dataset_ids;
    }
    if (currentSessionId) {
      return getStoredDatasets(currentSessionId);
    }
    return [];
  }, [dashboard, currentSessionId]);

  const activeDatasets = useMemo(() => {
    return datasets.filter(ds => activeDatasetIds.includes(ds.id));
  }, [datasets, activeDatasetIds]);

  // Is LLM config empty?
  const isLLMConfigured = useMemo(() => {
    return !!llmConfig.base_url && !!llmConfig.api_key;
  }, [llmConfig]);

  // Streaming Hook
  const extraBody = useMemo(() => ({
    context_dataset_ids: activeDatasetIds,
    dashboard_id: dashboardId || null,
    llm_config_override: {
      base_url: llmConfig.base_url,
      api_key: llmConfig.api_key,
      model_name: llmConfig.model_name,
      api_type: llmConfig.api_type,
      headers: llmConfig.headers
    }
  }), [activeDatasetIds, dashboardId, llmConfig]);

  const {
    streamingMessage,
    thinkingText,
    isStreaming,
    isThinking,
    toolCalls,
    sendMessage,
    chatEndRef,
    scrollContainerRef,
    pendingUserMessage,
    stopStreaming
  } = useStreamingChat({ extraBody });

  // Monitor isStreaming changes to auto-refetch the dashboard configuration
  useEffect(() => {
    if (!isStreaming && currentSessionId) {
      refetchCurrentSession();
      if (dashboardId) {
        refetchDashboard();
      }
    }
  }, [isStreaming, currentSessionId, dashboardId, refetchCurrentSession, refetchDashboard]);

  // Handle switching sessions
  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
  };

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async ({ name, datasetIds }: { name: string; datasetIds: number[] }) => {
      const response = await api.post('/api/ai/sessions', {
        title: name,
        bot_id: 'dashboard'
      });
      return { session: response.data, datasetIds };
    },
    onSuccess: ({ session, datasetIds }) => {
      storeDatasets(session.id, datasetIds);
      queryClient.invalidateQueries({ queryKey: ['genie-sessions'] });
      setCurrentSessionId(session.id);
      setIsCreateModalOpen(false);
      setNewSpaceName('');
      setSelectedDatasetIds([]);
      toast.success('Genie Space created successfully!');
    }
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/ai/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genie-sessions'] });
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
      toast.success('Space deleted');
    }
  });

  // Update dashboard mutation (for layout changes)
  const updateDashboardMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!dashboardId) throw new Error("No dashboard ID");
      const response = await api.patch(`/api/dashboards/${dashboardId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      // Don't refetch immediately to avoid jitter, let the local state hold
      queryClient.invalidateQueries({ queryKey: ['genie-dashboard', dashboardId] });
    }
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/dashboards/${id}`);
    },
    onSuccess: () => {
      toast.success('Dashboard deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      refetchCurrentSession();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete dashboard');
    }
  });

  const handleLayoutChange = (newLayout: any[]) => {
    if (!activePage || !dashboard) return;
    
    // Map new layout dimensions back to our format
    const updatedLayout = activePage.layout.map((item: any) => {
      const match = newLayout.find((nl: any) => nl.i === item.i);
      if (match) {
        return { ...item, x: match.x, y: match.y, w: match.w, h: match.h };
      }
      return item;
    });

    const updatedPages = dashboard.pages.map((p: any, idx: number) => 
      idx === 0 ? { ...p, layout: updatedLayout } : p
    );

    updateDashboardMutation.mutate({ pages: updatedPages });
  };

  const [inputMessage, setInputMessage] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentSessionId) return;

    if (!isLLMConfigured) {
      setIsConfigModalOpen(true);
      toast.error('Please configure your LLM settings first.');
      return;
    }

    const msg = inputMessage;
    setInputMessage('');

    const createSessionDummy = async () => currentSession;
    await sendMessage(
      msg,
      currentSessionId,
      'dashboard',
      createSessionDummy
    );
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (!currentSessionId) return;
    if (!isLLMConfigured) {
      setIsConfigModalOpen(true);
      toast.error('Please configure your LLM settings first.');
      return;
    }
    await sendMessage(
      prompt,
      currentSessionId,
      'dashboard',
      async () => currentSession
    );
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('genie_llm_config', JSON.stringify(llmConfig));
    setIsConfigModalOpen(false);
    toast.success('LLM connectivity configuration updated.');
  };

  const activePage = dashboard?.pages?.[0] || { layout: [], filter_config: [] };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* ─── SIDEBAR: Spaces list ─── */}
      <div 
        className={`bg-white dark:bg-[#0a0a0f] border-r border-slate-200 dark:border-slate-800/60 flex flex-col shrink-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72 md:w-80'
        }`}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand dark:text-brand-light shadow-sm">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white block">Genie Spaces</span>
              <span className="text-[10px] text-slate-500 font-medium block">Dashboard Builder AI</span>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors flex items-center justify-center"
            title="Create New Space"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {isLoadingSessions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl border border-dashed border-slate-350 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-600 mx-auto">
                <LayoutGrid size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No active spaces</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Create a custom workspace environment to collaborate with our dashboard building agent.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto"
              >
                Create space <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.id === currentSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#e1effe] dark:bg-indigo-900/40 text-slate-900 dark:text-white'
                      : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-8">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      <Layout size={14} />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs truncate leading-snug">{sess.title}</p>
                      <p className={`text-[10px] mt-0.5 font-medium flex items-center gap-1.5 ${isActive ? 'text-indigo-700/70 dark:text-indigo-300/70' : 'text-slate-400 dark:text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sess.dashboard_id ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        {sess.dashboard_id ? 'Dashboard Linked' : 'Awaiting Init'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this Genie Space?')) {
                        deleteSessionMutation.mutate(sess.id);
                      }
                    }}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-450 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {!currentSessionId ? (
          /* Empty Workspace state */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-955 relative overflow-hidden h-full w-full">
            {/* Grid blueprint background */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" 
              style={{
                backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-md text-center space-y-6 relative z-10 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xl shadow-slate-100 dark:shadow-none animate-in zoom-in-95 duration-350">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30 hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Databricks Genie Workspace</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Collaborate with our smart dashboard builder. Connect your relational tables, specify metrics, and watch the AI layout production-grade canvas elements in real-time.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Create Genie Space
                </button>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="w-full px-5 py-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <Settings size={14} /> Configure LLM Connectivity
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Split Workspace Screen */
          <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
            
            {/* LEFT PANE: AI Chat Bot */}
            <div className="w-[440px] md:w-[480px] shrink-0 border-r border-slate-200 dark:border-slate-800/80 flex flex-col bg-white dark:bg-slate-900/60 min-h-0">
              
              {/* Header info */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="truncate pr-4 flex items-center gap-2">
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                    title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                  </button>
                  <div className="truncate">
                    <h2 className="font-extrabold text-xs text-slate-805 dark:text-slate-200 truncate">{currentSession?.title}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold border border-indigo-150 dark:border-indigo-900/30 flex items-center gap-1">
                        <Database size={10} />
                        <span>{activeDatasetIds.length} Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <button
                    onClick={() => setIsConfigModalOpen(true)}
                    className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-805 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-all border border-slate-200 dark:border-slate-700"
                    title="LLM Settings"
                  >
                    <Sliders size={14} />
                  </button>
                </div>
              </div>

              {/* Connected Datasets Scope */}
              {activeDatasets.length > 0 && (
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Database size={11} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Datasets in Scope</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDatasets.map((ds) => (
                      <span
                        key={ds.id}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-lg text-[10px] font-bold border border-slate-200/85 dark:border-slate-750 transition-colors truncate max-w-[190px]"
                        title={ds.description || ds.name}
                      >
                        {ds.name} (ID: {ds.id})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-slate-50/20 dark:bg-slate-900/10 min-h-0"
              >
                {/* Warning Banner if LLM is not configured */}
                {!isLLMConfigured && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/30 rounded-2xl flex items-start gap-3 shadow-sm mb-4 animate-in fade-in duration-300">
                    <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 w-5 h-5 mt-0.5" />
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-bold text-amber-850 dark:text-amber-200">LLM Connectivity Required</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        To enable AI dashboard generation, you must configure a base URL, API key, and model.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsConfigModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold transition-all shadow shadow-amber-600/10"
                      >
                        Configure Now
                      </button>
                    </div>
                  </div>
                )}

                {currentSession?.messages?.map((msg) => {
                  const isUser = msg.role === 'user';
                  if (isUser) {
                    return (
                      <div key={msg.id} className="w-full flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 mb-6">
                        <div className="flex justify-end w-full pl-8">
                          <div className="rounded-[20px] rounded-tr-sm px-4 py-3 text-[13px] leading-relaxed bg-[#e1effe] dark:bg-indigo-900/40 text-slate-900 dark:text-slate-100 shadow-sm inline-block">
                            <div className="prose prose-slate dark:prose-invert">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                                components={MARKDOWN_COMPONENTS}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="w-full flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 mb-8">
                      <div className="flex gap-3.5 w-full">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-900/20 flex items-center justify-center shrink-0 shadow-sm text-indigo-600 dark:text-indigo-400">
                          <Bot size={15} />
                        </div>
                        <div className="space-y-3 min-w-0 flex-1 pt-1">
                          {/* Main content */}
                          <div className="bg-transparent text-slate-800 dark:text-slate-200">
                            <div className="prose prose-slate dark:prose-invert text-[13px] leading-relaxed max-w-none">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                                components={MARKDOWN_COMPONENTS}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Custom layout of tool executions inside chat */}
                          {msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              {msg.tool_calls.map((tc: any, idx: number) => {
                                return (
                                  <div key={tc.id || idx} className="flex items-center gap-2 px-3 py-1.5 w-fit rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                    <Check size={12} className="text-emerald-500 shrink-0" />
                                    <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Used tool: <span className="font-mono text-slate-800 dark:text-slate-200">{tc.name}</span></span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Optimistic User Message Rendering */}
                {pendingUserMessage && (
                  <div className="w-full flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 mb-6">
                    <div className="flex justify-end w-full pl-8">
                      <div className="rounded-[20px] rounded-tr-sm px-4 py-3 text-[13px] leading-relaxed bg-[#e1effe] dark:bg-indigo-900/40 text-slate-900 dark:text-slate-100 shadow-sm inline-block">
                        <div className="prose prose-slate dark:prose-invert">
                          <p className="mb-0 whitespace-pre-wrap">{pendingUserMessage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Streaming Response Rendering */}
                {(isStreaming || isThinking) && (
                  <div className="w-full flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 mb-8">
                    <div className="flex gap-3.5 w-full">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-900/20 flex items-center justify-center shrink-0 shadow-sm text-indigo-600 dark:text-indigo-400">
                        <Bot size={15} />
                      </div>
                      <div className="space-y-3 min-w-0 flex-1 pt-1">
                        
                        {/* Agentic Execution */}
                        {(isThinking || toolCalls.length > 0) && (
                          <div className="flex flex-col mb-2">
                            {isThinking && (
                              <div className="mb-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left w-fit cursor-default">
                                  <Loader2 size={12} className="animate-spin text-slate-500 shrink-0" />
                                  <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                                    Thought process {thinkingText && <span className="text-[10px] italic">({thinkingText})</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {toolCalls.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                {toolCalls.map((tc) => (
                                  <div key={tc.id} className="flex items-center gap-2 px-3 py-1.5 w-fit rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                    <Loader2 size={12} className="animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Using tool: <span className="font-mono text-slate-800 dark:text-slate-200">{tc.name}</span></span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Streamed text */}
                        <div className="bg-transparent text-slate-800 dark:text-slate-200">
                          {streamingMessage ? (
                            <div className="prose prose-slate dark:prose-invert text-[13px] leading-relaxed max-w-none">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                                components={MARKDOWN_COMPONENTS}
                              >
                                {streamingMessage + ' ▍'}
                              </ReactMarkdown>
                            </div>
                          ) : !isThinking && toolCalls.length === 0 ? (
                            <div className="flex gap-1 py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Suggestions */}
              {currentSession?.messages?.length === 0 && (
                <div className="px-6 pb-6 pt-2 shrink-0">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleQuickPrompt("Create a sales operation overview dashboard")}
                      className="px-4 py-2 text-left rounded-full bg-white dark:bg-[#161622] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                    >
                      Create Sales Dashboard <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleQuickPrompt("Add a bar chart for order quantities by category")}
                      className="px-4 py-2 text-left rounded-full bg-white dark:bg-[#161622] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                    >
                      Add Category Bar Chart <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleQuickPrompt("Change the dashboard theme to dark and style it cleanly")}
                      className="px-4 py-2 text-left rounded-full bg-white dark:bg-[#161622] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                    >
                      Switch Theme to Dark <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleQuickPrompt("Add a filter for region selection")}
                      className="px-4 py-2 text-left rounded-full bg-white dark:bg-[#161622] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                    >
                      Add Region Filter <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 flex items-center gap-2.5 shrink-0">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isStreaming || isThinking}
                  placeholder={
                    isStreaming || isThinking
                      ? "Genie is applying changes..."
                      : "Instruct Genie (e.g. 'add a total revenue KPI')"
                  }
                  className="flex-1 bg-slate-55 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-950 dark:hover:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-805 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-550 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
                {isStreaming || isThinking ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm flex items-center justify-center hover:scale-105 active:scale-95 shrink-0"
                    title="Stop generating"
                  >
                    <div className="w-3.5 h-3.5 bg-current rounded-sm" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center hover:scale-105 active:scale-95 shrink-0"
                  >
                    <Send size={14} className={inputMessage.trim() ? '-translate-x-0.5 translate-y-0.5 transition-transform' : ''} />
                  </button>
                )}
              </form>
            </div>

            {/* RIGHT PANE: Visual Dashboard Canvas */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-955 overflow-hidden relative min-h-0 min-w-0">
              {!dashboardId ? (
                /* Empty Canvas state */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-955">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800/80 flex items-center justify-center mb-4 text-slate-450 dark:text-slate-500 shadow-sm">
                    <Grid size={24} className="opacity-60" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Interactive Preview Canvas</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1.5 max-w-xs leading-relaxed">
                    Once initialized, your interactive layout workspace will load here. Say: <span className="font-mono text-[11px] bg-slate-150 dark:bg-slate-900 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">"Create a dashboard"</span> to get started.
                  </p>
                </div>
              ) : isLoadingDashboard ? (
                <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-955">
                  <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                    <p className="text-xs text-slate-555 dark:text-slate-405 font-bold">Mounting workspace canvas...</p>
                  </div>
                </div>
              ) : (
                /* Interactive Canvas */
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
                  
                  {/* Canvas Toolbar */}
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm z-10 shrink-0">
                    <div className="truncate pr-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">{dashboard?.title}</h3>
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-955/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase tracking-wide rounded-md border border-emerald-150 dark:border-emerald-900/30">
                          Active
                        </span>
                      </div>
                      {dashboard?.description && (
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium truncate">{dashboard.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => {
                          refetchDashboard();
                          queryClient.invalidateQueries({ queryKey: ['charts'] });
                          toast.success('Refreshing dashboard data...');
                        }}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-150 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-855 dark:hover:text-slate-200 rounded-xl transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700/60"
                        title="Sync Canvas"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this dashboard? This action cannot be undone.")) {
                            deleteDashboardMutation.mutate(dashboard.id);
                          }
                        }}
                        disabled={deleteDashboardMutation.isPending}
                        className="w-8 h-8 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 rounded-xl transition-all flex items-center justify-center border border-rose-200 dark:border-rose-800/60 disabled:opacity-50"
                        title="Delete Dashboard"
                      >
                        <Trash2 size={13} />
                      </button>
                      <a
                        href={`/dashboards/${dashboard.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm border border-transparent dark:border-slate-700/60 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Eye size={13} />
                        <span>View Dashboard</span>
                        <ExternalLink size={11} className="opacity-60" />
                      </a>
                    </div>
                  </div>

                  {/* Filter controls preview (if any exist) */}
                  {activePage.filter_config && activePage.filter_config.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 px-6 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 z-[100] backdrop-blur-md py-1.5 transition-all shrink-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1.5 mr-2">
                        <Layers size={11} />
                        <span>Filters:</span>
                      </div>
                      {activePage.filter_config.map((flt: any) => (
                        <DashboardFilter
                          key={flt.id}
                          filter={flt}
                          stagedFilters={stagedFilters}
                          setStagedFilters={setStagedFilters}
                          openFilterId={openFilterId}
                          setOpenFilterId={setOpenFilterId}
                          isMobile={isMobile}
                          allFilters={activePage.filter_config || []}
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
                    </div>
                  )}

                  {/* Drill Filter Bar Portal Target */}
                  <div id="drill-bar-portal" className="flex flex-wrap items-center gap-2 px-6 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 empty:hidden z-[100] backdrop-blur-md py-1.5 transition-all shrink-0"></div>

                  {/* Canvas Body (Theme Custom CSS Styles) */}
                  <div
                    className="flex-1 overflow-y-auto p-6 transition-all duration-300 custom-scrollbar relative min-h-0 min-w-0"
                    style={{
                      backgroundColor: dashboard?.background_color || undefined,
                      color: dashboard?.text_color || undefined,
                    }}
                  >
                    {/* Grid blueprint pattern for standard view */}
                    {!dashboard?.background_color && (
                      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015] pointer-events-none" 
                        style={{
                          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                          backgroundSize: '20px 20px'
                        }}
                      />
                    )}


                    {activePage.layout && activePage.layout.length > 0 ? (
                      <ResponsiveGridLayout
                        className="layout relative z-10"
                        layout={activePage.layout}
                        cols={dashboard?.grid_cols || 12}
                        rowHeight={dashboard?.row_height || 85}
                        compactType={null}
                        preventCollision={true}
                        isDraggable={true}
                        isResizable={true}
                        draggableHandle=".drag-handle"
                        onLayoutChange={handleLayoutChange}
                        margin={[dashboard?.grid_gap ?? 16, dashboard?.grid_gap ?? 16]}
                      >
                        {activePage.layout.map((widget: any) => {
                          const isChart = widget.widget_type === 'chart' || widget.chart_id;
                          return (
                            <div
                              key={widget.i}
                              className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200 dark:border-slate-800/85 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden transition-all hover:border-indigo-500/30 group/widget relative"
                            >
                              <div className="drag-handle flex items-center justify-between shrink-0 mb-2 border-b border-slate-100 dark:border-slate-800/60 pb-2 cursor-grab active:cursor-grabbing px-4 pt-3 mt-1 mx-1">
                                <span className="font-extrabold text-[11px] truncate max-w-[85%]" style={{ color: dashboard?.text_color || undefined }}>
                                  {widget.title || 'Untitled Card'}
                                </span>
                                <button
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); handleQuickPrompt(`delete widget ${widget.i}`); }}
                                  className="opacity-0 group-hover/widget:opacity-100 p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-all absolute top-2 right-2 z-[60]"
                                  title="Delete Widget"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <div className="flex-1 min-h-0 relative px-4 pb-4" onMouseDown={(e) => e.stopPropagation()}>
                                {isChart && widget.chart_id ? (
                                  <DashboardWidget
                                    chartId={widget.chart_id}
                                    theme={dashboard?.echarts_theme}
                                    dashboardId={dashboard?.id}
                                    dashboardName={dashboard?.title}
                                    height="100%"
                                    filters={mergedFilters}
                                    onDrillFiltersChange={(df, ds) => handleWidgetDrillFiltersChange(widget.chart_id, df, ds)}
                                    restoreDrillAction={chartsDrillStacks[widget.chart_id] ? { stack: chartsDrillStacks[widget.chart_id], timestamp: Date.now() } : undefined}
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600 text-xs">
                                    No preview data available
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </ResponsiveGridLayout>
                    ) : (
                      <div className="text-center py-24 bg-white dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-305 dark:border-slate-800 relative z-10 shadow-sm">
                        <LayoutGrid className="w-10 h-10 text-slate-350 dark:text-slate-650 mx-auto mb-3" />
                        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Empty Page Layout</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                          This dashboard page does not contain any components. Instruct Genie to <span className="font-medium text-slate-600 dark:text-slate-300">"add a bar chart of top regions"</span> or <span className="font-medium text-slate-600 dark:text-slate-300">"add a total orders KPI card"</span>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ─── MODAL: Create Space ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 dark:bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161622] border border-slate-200 dark:border-slate-800/60 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <h3 className="font-extrabold text-[15px] text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand dark:text-brand-light">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                Initialize Genie Space
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-5 py-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Space Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales & Finance Overview"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Attach Logical Datasets
                </label>
                
                {/* Custom Multi-select Trigger */}
                <div 
                  onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
                  className="w-full min-h-[46px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-wrap gap-1.5 items-center flex-1">
                    {selectedDatasetIds.length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-600">Select datasets to include...</span>
                    ) : (
                      datasets.filter(ds => selectedDatasetIds.includes(ds.id)).map(ds => (
                        <span key={ds.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                          {ds.name}
                          <div 
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDatasetIds(selectedDatasetIds.filter(id => id !== ds.id));
                            }}
                          >
                            <X size={10} strokeWidth={3} />
                          </div>
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isDatasetDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Menu */}
                {isDatasetDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-[#161622] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-2">
                      {datasets.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-[12px] text-slate-500 font-medium">No datasets discovered for this LOB.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {datasets.map((ds) => {
                            const isSelected = selectedDatasetIds.includes(ds.id);
                            return (
                              <div
                                key={ds.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedDatasetIds(selectedDatasetIds.filter(id => id !== ds.id));
                                  } else {
                                    setSelectedDatasetIds([...selectedDatasetIds, ds.id]);
                                  }
                                }}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-[#e1effe] dark:bg-brand/20' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    isSelected 
                                      ? 'bg-brand border-brand text-white' 
                                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                                  }`}>
                                    {isSelected && <Check size={10} strokeWidth={3} />}
                                  </div>
                                  <span className={`text-[13px] font-medium ${isSelected ? 'text-brand-dark dark:text-brand-light' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {ds.name}
                                  </span>
                                </div>
                                <Database size={12} className={isSelected ? 'text-brand/60' : 'text-slate-400'} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[13px] rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createSessionMutation.mutate({ name: newSpaceName, datasetIds: selectedDatasetIds })}
                disabled={!newSpaceName.trim() || createSessionMutation.isPending}
                className="px-6 py-2.5 bg-brand hover:bg-brand-dark disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 text-[13px] rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                {createSessionMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                <span>Initialize Space</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: LLM Configuration ─── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 dark:bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveConfig} className="bg-white dark:bg-[#161622] border border-slate-200 dark:border-slate-800/60 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-left flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <h3 className="font-extrabold text-[15px] text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand dark:text-brand-light">
                  <Sliders size={16} />
                </div>
                LLM Connectivity Setup
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-5 py-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  API Protocol / Type
                </label>
                <div className="relative">
                  <select
                    value={llmConfig.api_type}
                    onChange={(e) => setLlmConfig({ ...llmConfig, api_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="chat_completions">OpenAI / Chat Completions</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Base Endpoint URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://api.openai.com/v1"
                  value={llmConfig.base_url}
                  onChange={(e) => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Secret API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={llmConfig.api_key}
                  onChange={(e) => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  LLM Model Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet-20241022"
                  value={llmConfig.model_name}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Custom Headers (JSON)
                </label>
                <textarea
                  placeholder='e.g. {"HTTP-Referer": "https://myapp.com", "X-Title": "MyApp"}'
                  value={llmConfig.headers || ''}
                  onChange={(e) => setLlmConfig({ ...llmConfig, headers: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[13px] rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-[13px] rounded-xl font-bold shadow-sm transition-all"
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default GenieWorkspacePage;
