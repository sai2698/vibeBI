import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  Search, X, Home, LayoutDashboard, Plus, PieChart, BarChart3, LineChart, Activity, Code2, Table as TableIcon, Loader2,
  Type, AlignLeft, Minus, LayoutTemplate, Layers, Grid, List
} from 'lucide-react';
import api from '../../../api';
import { useLOBStore } from '../../../store/useLOBStore';

interface ChartFolder {
  id: number;
  name: string;
  parent_id: number | null;
  lob_id: number;
}

interface Chart {
  id: number;
  title: string;
  chart_type: string;
  folder_id: number | null;
}

interface SelectChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChart?: (chart: any) => void;
  onSelectCharts?: (charts: any[]) => void;
  hideLayoutTab?: boolean;
  multiSelect?: boolean;
}

const getChartIcon = (type: string) => {
  switch (type) {
    case 'bar': return <BarChart3 size={20} />;
    case 'line': return <LineChart size={20} />;
    case 'pie': return <PieChart size={20} />;
    case 'kpi': return <Activity size={20} />;
    case 'table': return <TableIcon size={20} />;
    case 'custom': return <Code2 size={20} />;
    default: return <PieChart size={20} />;
  }
};

const SelectChartModal: React.FC<SelectChartModalProps> = ({ isOpen, onClose, onSelectChart, onSelectCharts, hideLayoutTab, multiSelect }) => {
  const { activeLOB } = useLOBStore();
  const [currentFolderId, setCurrentFolderId] = useState<number | null | 'all'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'charts' | 'layout'>('charts');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCharts, setSelectedCharts] = useState<any[]>([]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentFolderId('all');
      setSearchQuery('');
      setSelectedCharts([]);
    }
  }, [isOpen]);

  const handleSelectFolder = (id: number | null | 'all') => {
    setCurrentFolderId(id);
    setSearchQuery('');
  };

  const { data: folders = [], isLoading: isLoadingFolders } = useQuery<ChartFolder[]>({
    queryKey: ['chart_folders', activeLOB?.id],
    queryFn: async () => {
      const res = await api.get('/api/chart-folders/', { params: { lob_id: activeLOB?.id } });
      return res.data;
    },
    enabled: !!activeLOB && isOpen
  });

  const { data: charts = [], isLoading: isLoadingCharts } = useQuery<Chart[]>({
    queryKey: ['charts', activeLOB?.id],
    queryFn: async () => {
      const res = await api.get('/api/charts/', { params: { lob_id: activeLOB?.id, exclude_chart_type: 'custom_template' } });
      return res.data;
    },
    enabled: !!activeLOB && isOpen
  });

  const safeFolders = useMemo(() => Array.isArray(folders) ? folders : [], [folders]);
  const safeCharts = useMemo(() => Array.isArray(charts) ? charts : [], [charts]);

  const breadcrumbs = useMemo(() => {
    if (currentFolderId === 'all') return [];
    const path: ChartFolder[] = [];
    let current = currentFolderId;
    while (current) {
      const folder = safeFolders.find(f => f.id === current);
      if (folder) {
        path.unshift(folder);
        current = folder.parent_id;
      } else {
        break;
      }
    }
    return path;
  }, [currentFolderId, safeFolders]);

  const { displayFolders, displayCharts } = useMemo(() => {
    let currentFolders = safeFolders;
    let currentCharts = safeCharts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      currentFolders = safeFolders.filter(f => f.name.toLowerCase().includes(q));
      currentCharts = safeCharts.filter(c => c.title.toLowerCase().includes(q) || c.chart_type.toLowerCase().includes(q));
    } else {
      if (currentFolderId === 'all') {
        currentFolders = [];
        currentCharts = safeCharts;
      } else {
        currentFolders = safeFolders.filter(f => f.parent_id === currentFolderId);
        currentCharts = safeCharts.filter(c => c.folder_id === currentFolderId);
      }
    }
    return { displayFolders: currentFolders, displayCharts: currentCharts };
  }, [safeFolders, safeCharts, currentFolderId, searchQuery]);

  const toggleFolder = (e: React.MouseEvent, folderId: number) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const renderSidebarTree = (parentId: number | null, depth = 0) => {
    const children = safeFolders.filter(f => f.parent_id === parentId);
    if (!children.length) return null;

    return (
      <div className="space-y-0.5 mt-0.5">
        {children.map(folder => {
          const isSelected = currentFolderId === folder.id;
          const hasChildren = safeFolders.some(f => f.parent_id === folder.id);
          const isExpanded = expandedFolders.has(folder.id);

          return (
            <div key={folder.id}>
              <button
                type="button"
                onClick={() => handleSelectFolder(folder.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm font-medium transition-all group ${
                  isSelected
                    ? 'bg-brand/10 text-brand dark:bg-brand/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
              >
                <div className="flex items-center gap-2 truncate">
                  {hasChildren ? (
                    <div 
                      onClick={(e) => toggleFolder(e, folder.id)}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  ) : (
                    <div className="w-[18px] shrink-0" />
                  )}
                  {isSelected ? (
                    <FolderOpen size={14} className="shrink-0 text-brand fill-brand/20" />
                  ) : (
                    <Folder size={14} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>
              </button>
              
              {isExpanded && renderSidebarTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0a0a0f] rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 flex-col">
        
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-xl">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Add Widget to Dashboard</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Select a chart or layout element</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
              <input
                type="text"
                placeholder="Search charts and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-slate-900 dark:text-white font-medium"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar */}
          <div className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 custom-scrollbar">
            
            {!hideLayoutTab && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'charts' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <PieChart size={14} /> Charts
                </button>
                <button
                  onClick={() => setActiveTab('layout')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'layout' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutTemplate size={14} /> Layout
                </button>
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => handleSelectFolder('all')}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-all group ${
                      currentFolderId === 'all'
                        ? 'bg-brand/10 text-brand dark:bg-brand/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <LayoutDashboard size={14} className="shrink-0" />
                    <span>All Charts</span>
                  </button>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 mb-4" />

                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2 block">Folders</label>
                  <button
                    type="button"
                    onClick={() => handleSelectFolder(null)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-all group ${
                      currentFolderId === null
                        ? 'bg-brand/10 text-brand dark:bg-brand/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Home size={14} className="shrink-0" />
                    <span>Root Directory</span>
                  </button>
                  
                  <div className="mt-1">
                    {renderSidebarTree(null, 0)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0a0a0f]">
            {activeTab === 'charts' ? (
              <>
            {/* Header / Breadcrumbs Area */}
            <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-sm">
                {!searchQuery && currentFolderId !== 'all' && (
                  <>
                    <button
                      onClick={() => handleSelectFolder(null)}
                      className={`font-semibold transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md ${
                        currentFolderId === null ? 'bg-brand text-white' : 'text-slate-500 dark:text-slate-400 hover:text-brand hover:bg-brand/5'
                      }`}
                    >
                      <Home size={14} /> Root Directory
                    </button>
                    {breadcrumbs.map(folder => (
                      <React.Fragment key={folder.id}>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                        <button
                          onClick={() => handleSelectFolder(folder.id)}
                          className={`font-semibold transition-colors max-w-[150px] truncate px-2 py-1 rounded-md ${
                            currentFolderId === folder.id ? 'bg-brand text-white' : 'text-slate-500 dark:text-slate-400 hover:text-brand hover:bg-brand/5'
                          }`}
                        >
                          {folder.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </>
                )}
                
                {searchQuery && (
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Search results for "<span className="text-brand">{searchQuery}</span>"
                  </span>
                )}
                
                {currentFolderId === 'all' && !searchQuery && (
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <LayoutDashboard size={14} /> All Available Charts
                  </span>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Grid View"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="List View"
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {(isLoadingFolders || isLoadingCharts) ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="animate-spin text-brand" size={32} />
                </div>
              ) : displayFolders.length === 0 && displayCharts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="opacity-40" />
                  </div>
                  <p className="font-bold text-sm">No items found</p>
                  <p className="text-xs mt-1 text-slate-400">Try navigating to a different folder or clearing your search.</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}>
                  {/* Render Folders */}
                  {displayFolders.map(folder => (
                    viewMode === 'grid' ? (
                      <div
                        key={`folder-${folder.id}`}
                        onClick={() => handleSelectFolder(folder.id)}
                        className="group flex flex-col items-center p-6 bg-white dark:bg-[#161622] rounded-xl cursor-pointer select-none transition-all border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
                      >
                        <Folder size={48} fill="currentColor" strokeWidth={1} className="text-sky-400 mb-3" />
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 text-center line-clamp-2 leading-snug">{folder.name}</span>
                      </div>
                    ) : (
                      <div
                        key={`folder-${folder.id}`}
                        onClick={() => handleSelectFolder(folder.id)}
                        className="group flex items-center gap-4 p-4 bg-white dark:bg-[#161622] rounded-xl cursor-pointer select-none transition-all border border-slate-150 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 shadow-sm hover:shadow-md w-full"
                      >
                        <Folder size={24} fill="currentColor" strokeWidth={1} className="text-sky-400 shrink-0" />
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{folder.name}</span>
                        <ChevronRight size={16} className="text-slate-300 ml-auto group-hover:text-brand transition-colors" />
                      </div>
                    )
                  ))}

                  {/* Render Charts */}
                  {displayCharts.map(chart => {
                    const isSelected = multiSelect && selectedCharts.some(c => c.id === chart.id);
                    return viewMode === 'grid' ? (
                      <button
                        key={`chart-${chart.id}`}
                        onClick={() => {
                          if (multiSelect) {
                            if (isSelected) {
                              setSelectedCharts(prev => prev.filter(c => c.id !== chart.id));
                            } else {
                              setSelectedCharts(prev => [...prev, chart]);
                            }
                          } else if (onSelectChart) {
                            onSelectChart(chart);
                          }
                        }}
                        className={`group flex flex-col items-start p-5 rounded-xl bg-white dark:bg-[#161622] border-2 transition-all duration-300 text-left relative overflow-hidden h-full ${
                          isSelected 
                            ? 'border-brand shadow-md bg-brand/5' 
                            : 'border-transparent hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5'
                        }`}
                      >
                        <div className={`absolute top-0 right-0 p-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${isSelected ? 'bg-brand text-white' : 'bg-brand text-white'}`}>
                            {isSelected ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <Plus size={16} strokeWidth={3} />
                            )}
                          </div>
                        </div>

                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors shrink-0">
                          {getChartIcon(chart.chart_type)}
                        </div>

                        <div className="w-full mt-auto">
                          <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-1.5 line-clamp-3 leading-snug">{chart.title || 'Untitled Chart'}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">{chart.chart_type}</span>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        key={`chart-${chart.id}`}
                        onClick={() => {
                          if (multiSelect) {
                            if (isSelected) {
                              setSelectedCharts(prev => prev.filter(c => c.id !== chart.id));
                            } else {
                              setSelectedCharts(prev => [...prev, chart]);
                            }
                          } else if (onSelectChart) {
                            onSelectChart(chart);
                          }
                        }}
                        className={`group flex items-center gap-4 p-4 bg-white dark:bg-[#161622] rounded-xl cursor-pointer select-none transition-all border shadow-sm w-full text-left ${
                          isSelected 
                            ? 'border-brand bg-brand/5 shadow-md' 
                            : 'border-slate-150 hover:border-brand/30 dark:border-slate-800 dark:hover:border-brand/30 hover:shadow-md'
                        }`}
                      >
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-brand/10 group-hover:text-brand transition-colors shrink-0">
                          {getChartIcon(chart.chart_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-0.5 truncate">{chart.title || 'Untitled Chart'}</div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">{chart.chart_type}</div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-opacity shrink-0 ${isSelected ? 'opacity-100 bg-brand text-white' : 'opacity-0 group-hover:opacity-100 bg-brand text-white'}`}>
                          {isSelected ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : <Plus size={16} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            </>
            ) : (
              <div className="p-6">
                <div className="h-12 mb-4 border-b border-slate-200 dark:border-slate-800 flex items-center shrink-0">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <LayoutTemplate size={14} /> Layout Elements
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { type: 'header', title: 'Header', icon: <Type size={20} />, desc: 'Large title text' },
                    { type: 'text', title: 'Text/Markdown', icon: <AlignLeft size={20} />, desc: 'Rich text block' },
                    { type: 'divider', title: 'Divider', icon: <Minus size={20} />, desc: 'Horizontal line separator' },
                    { type: 'tabs', title: 'Tabs Container', icon: <Layers size={20} />, desc: 'Tabbed chart viewer' }
                  ].map(item => {
                    const isSelected = multiSelect && selectedCharts.some(c => c.id === -1 && c.title === item.title);
                    
                    return (
                      <button
                        key={item.type}
                        onClick={() => {
                          const chartObj = { 
                            id: -1, 
                            title: item.title, 
                            chart_type: item.type, 
                            widget_type: item.type, 
                            content: item.type === 'header' ? 'New Header' : item.type === 'tabs' ? JSON.stringify([{ id: 'tab1', label: 'Tab 1', chart_id: null }]) : '' 
                          };
                          if (multiSelect) {
                            setSelectedCharts(prev => [...prev, chartObj]); // allow pushing multiple layout elements
                          } else if (onSelectChart) {
                            onSelectChart(chartObj);
                          }
                        }}
                        className={`group flex flex-col items-start p-5 rounded-xl bg-white dark:bg-[#161622] border-2 transition-all duration-300 text-left relative overflow-hidden ${
                          isSelected 
                            ? 'border-brand shadow-md bg-brand/5' 
                            : 'border-transparent hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5'
                        }`}
                      >
                        <div className={`absolute top-0 right-0 p-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${isSelected ? 'bg-brand text-white' : 'bg-brand text-white'}`}>
                            {isSelected ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <Plus size={16} strokeWidth={3} />
                            )}
                          </div>
                        </div>

                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                          {item.icon}
                        </div>

                        <div className="w-full">
                          <div className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1 truncate">{item.title}</div>
                          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{item.desc}</div>
                          
                          {/* If multiple layout elements of this type are selected, show badge */}
                          {multiSelect && selectedCharts.filter(c => c.id === -1 && c.title === item.title).length > 0 && (
                            <div className="absolute top-3 left-3 w-6 h-6 bg-brand text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {selectedCharts.filter(c => c.id === -1 && c.title === item.title).length}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer for Multi-Select */}
        {multiSelect && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center rounded-b-2xl">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {selectedCharts.length} chart{selectedCharts.length !== 1 && 's'} selected
            </span>
            <div className="flex gap-3">
              <button 
                onClick={onClose} 
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                   if (onSelectCharts) onSelectCharts(selectedCharts);
                }}
                disabled={selectedCharts.length === 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                Add {selectedCharts.length > 0 ? selectedCharts.length : ''} {selectedCharts.length === 1 ? 'Item' : 'Items'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SelectChartModal;
