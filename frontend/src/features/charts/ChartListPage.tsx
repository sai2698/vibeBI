import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid, List, Search, Plus,
  Trash2, Edit3, FolderPlus, Folder,
  ChevronRight, ChevronDown, Copy, Scissors, ClipboardPaste,
  FolderOpen, BarChart3, PieChart, LineChart, Activity, Code2,
  Layers, Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';
import { useLOBStore } from '../../store/useLOBStore';

interface Chart {
  id: number;
  title: string;
  chart_type: string;
  dataset_name?: string;
  created_at: string;
  folder_id: number | null;
  visual_config?: any;
}

interface ChartFolder {
  id: number;
  name: string;
  parent_id: number | null;
  lob_id: number;
}

type ClipboardState = {
  action: 'cut' | 'copy';
  items: { type: 'chart' | 'folder'; id: number }[];
};

const ChartListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeLOB } = useLOBStore();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ type: 'chart' | 'folder'; id: number }[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const toggleFolder = (e: React.MouseEvent, folderId: number) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Modals
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<{ type: 'chart' | 'folder'; id: number; name: string } | null>(null);
  const [newName, setNewName] = useState('');

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Fetch Data
  const { data: chartsData, isLoading: isLoadingCharts } = useQuery<Chart[]>({
    queryKey: ['charts', activeLOB?.id],
    queryFn: async () => {
      const res = await api.get('/api/charts/', { params: { lob_id: activeLOB?.id } });
      return res.data;
    },
    enabled: !!activeLOB
  });
  const charts = Array.isArray(chartsData) ? chartsData : [];

  const { data: foldersData, isLoading: isLoadingFolders } = useQuery<ChartFolder[]>({
    queryKey: ['chart_folders', activeLOB?.id],
    queryFn: async () => {
      const res = await api.get('/api/chart-folders/', { params: { lob_id: activeLOB?.id } });
      return res.data;
    },
    enabled: !!activeLOB
  });
  const folders = Array.isArray(foldersData) ? foldersData : [];

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const path: ChartFolder[] = [];
    let current = currentFolderId;
    while (current) {
      const folder = folders.find(f => f.id === current);
      if (folder) {
        path.unshift(folder);
        current = folder.parent_id;
      } else {
        break;
      }
    }
    return path;
  }, [currentFolderId, folders]);

  // Current Directory Contents
  const { currentCharts, currentFolders } = useMemo(() => {
    let currentCharts = charts;
    let currentFolders = folders;

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      currentCharts = charts.filter(c => c.title.toLowerCase().includes(lowerQ));
      currentFolders = folders.filter(f => f.name.toLowerCase().includes(lowerQ));
    } else {
      currentCharts = charts.filter(c => c.folder_id === currentFolderId);
      currentFolders = folders.filter(f => f.parent_id === currentFolderId);
    }
    return { currentCharts, currentFolders };
  }, [charts, folders, currentFolderId, searchQuery]);

  // Mutations
  const createFolderMut = useMutation({
    mutationFn: (name: string) => api.post('/api/chart-folders/', { name, parent_id: currentFolderId, lob_id: activeLOB?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart_folders'] });
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      toast.success('Folder created');
    }
  });

  const renameChartMut = useMutation({
    mutationFn: ({ id, title }: { id: number, title: string }) => api.patch(`/api/charts/${id}`, { title }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['charts'] }); setIsRenameModalOpen(false); }
  });

  const renameFolderMut = useMutation({
    mutationFn: ({ id, name }: { id: number, name: string }) => api.patch(`/api/chart-folders/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chart_folders'] }); setIsRenameModalOpen(false); }
  });

  const deleteChartMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/charts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['charts'] }); toast.success('Chart deleted'); }
  });

  const deleteFolderMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/chart-folders/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chart_folders'] }); toast.success('Folder deleted'); }
  });

  const moveChartsMut = useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: number[], targetFolderId: number | null }) => 
      Promise.all(ids.map(id => api.patch(`/api/charts/${id}`, { folder_id: targetFolderId }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charts'] })
  });

  const moveFoldersMut = useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: number[], targetFolderId: number | null }) => 
      Promise.all(ids.map(id => api.patch(`/api/chart-folders/${id}`, { parent_id: targetFolderId }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chart_folders'] })
  });

  const copyChartsMut = useMutation({
    mutationFn: async ({ ids, targetFolderId }: { ids: number[], targetFolderId: number | null }) => {
      for (const id of ids) {
        const res = await api.post(`/api/charts/${id}/duplicate`);
        if (targetFolderId !== undefined) {
          await api.patch(`/api/charts/${res.data.id}`, { folder_id: targetFolderId });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charts'] })
  });

  // Actions
  const handlePaste = async () => {
    if (!clipboard) return;
    const chartIds = clipboard.items.filter(i => i.type === 'chart').map(i => i.id);
    const folderIds = clipboard.items.filter(i => i.type === 'folder').map(i => i.id);

    // Prevent moving a folder into itself
    if (clipboard.action === 'cut' && folderIds.includes(currentFolderId as number)) {
      toast.error("Cannot move a folder into itself.");
      return;
    }

    try {
      if (clipboard.action === 'cut') {
        if (chartIds.length) await moveChartsMut.mutateAsync({ ids: chartIds, targetFolderId: currentFolderId });
        if (folderIds.length) await moveFoldersMut.mutateAsync({ ids: folderIds, targetFolderId: currentFolderId });
        toast.success(`Moved items successfully`);
        setClipboard(null);
      } else {
        if (chartIds.length) await copyChartsMut.mutateAsync({ ids: chartIds, targetFolderId: currentFolderId });
        if (folderIds.length) toast.error("Copying folders is not yet supported.");
        else toast.success(`Copied items successfully`);
      }
      setSelectedItems([]);
    } catch (e) {
      toast.error("Failed to paste items");
    }
  };

  const handleSelection = (type: 'chart' | 'folder', id: number) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.type === type && i.id === id);
      if (exists) return prev.filter(i => !(i.type === type && i.id === id));
      return [...prev, { type, id }];
    });
  };

  const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; dot: string }> = {
    bar: { icon: <BarChart3 size={16} />, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/60', dot: 'bg-sky-500' },
    pie: { icon: <PieChart size={16} />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60', dot: 'bg-emerald-500' },
    line: { icon: <LineChart size={16} />, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/60', dot: 'bg-violet-500' },
    scatter: { icon: <Activity size={16} />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60', dot: 'bg-amber-500' },
    custom: { icon: <Code2 size={16} />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/60', dot: 'bg-rose-500' },
  };

  const getTypeConfig = (type: string) => typeConfig[type] ?? {
    icon: <Grid size={16} />, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', dot: 'bg-slate-400'
  };

  if (isLoadingCharts || isLoadingFolders) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <div className="w-10 h-10 border-[3px] border-slate-200 dark:border-slate-700 border-t-brand rounded-full animate-spin" />
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Loading Charts</p>
      </div>
    );
  }

  // Tree rendering logic for sidebar
  const renderTree = (parentId: number | null, depth = 0) => {
    let children = folders.filter(f => f.parent_id === parentId);
    
    // If searching, ignore tree structure and just show flat list of matching folders
    if (folderSearchQuery) {
      if (depth > 0) return null; // only render at root level when searching
      const lowerQ = folderSearchQuery.toLowerCase();
      children = folders.filter(f => f.name.toLowerCase().includes(lowerQ));
    }

    if (!children.length) return null;
    return (
      <div className="space-y-0.5">
        {children.map(folder => {
          const isActive = currentFolderId === folder.id;
          const hasChildren = folders.some(f => f.parent_id === folder.id);
          const isExpanded = expandedFolders.has(folder.id) || !!folderSearchQuery;
          
          return (
            <div key={folder.id}>
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all group ${isActive
                  ? 'bg-brand/10 text-brand dark:bg-brand/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                style={{ paddingLeft: folderSearchQuery ? '8px' : `${depth * 12 + 8}px` }}
              >
                <div 
                  className={`w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${hasChildren ? 'cursor-pointer' : 'opacity-0'}`}
                  onClick={hasChildren ? (e) => toggleFolder(e, folder.id) : undefined}
                >
                  {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                </div>
                <FolderOpen size={14} className={isActive ? 'text-brand shrink-0' : 'text-slate-400 shrink-0 group-hover:text-slate-500'} />
                <span className="truncate">{folder.name}</span>
              </button>
              {isExpanded && renderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-65px)] bg-white dark:bg-[#0a0a0f] min-h-0">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 bg-slate-50 dark:bg-[#111118] border-r border-slate-200 dark:border-slate-800/60 flex flex-col overflow-hidden">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <Layers size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Charts</span>
          </div>
          
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-2 ${currentFolderId === null
              ? 'bg-brand text-white shadow-md shadow-brand/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
            }`}
          >
            <Home size={16} />
            All Charts
          </button>
        </div>

        <div className="px-5 mb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Folders</p>
            <button onClick={() => setIsCreateFolderModalOpen(true)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition-colors" title="New Folder">
              <FolderPlus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search folders..."
              value={folderSearchQuery}
              onChange={e => setFolderSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-[#161622] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6 custom-scrollbar">
          {renderTree(null)}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Toolbar & Breadcrumbs */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#111118] flex items-center justify-between gap-4">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 overflow-hidden text-sm">
            <button onClick={() => setCurrentFolderId(null)} className="text-slate-500 hover:text-brand font-medium transition-colors whitespace-nowrap">
              Root
            </button>
            {breadcrumbs.map((f, i) => (
              <React.Fragment key={f.id}>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                <button 
                  onClick={() => setCurrentFolderId(f.id)} 
                  className={`font-medium transition-colors truncate max-w-[150px] ${i === breadcrumbs.length - 1 ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-brand'}`}
                >
                  {f.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Context Actions if items selected */}
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-1 mr-4 pr-4 border-r border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 mr-2">{selectedItems.length} selected</span>
                <button 
                  onClick={() => setClipboard({ action: 'copy', items: selectedItems })}
                  className="p-1.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-lg transition" title="Copy">
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => setClipboard({ action: 'cut', items: selectedItems })}
                  className="p-1.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-lg transition" title="Cut">
                  <Scissors size={16} />
                </button>
                <button 
                  onClick={() => {
                    if(confirm(`Delete ${selectedItems.length} items?`)) {
                      selectedItems.forEach(i => {
                        if (i.type === 'chart') deleteChartMut.mutate(i.id);
                        if (i.type === 'folder') deleteFolderMut.mutate(i.id);
                      });
                      setSelectedItems([]);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* Paste Action */}
            {clipboard && (
              <div className="flex items-center gap-2 mr-4 pr-4 border-r border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-brand uppercase tracking-wider">{clipboard.action}ing {clipboard.items.length} items</span>
                <button 
                  onClick={handlePaste}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand hover:text-white rounded-lg text-sm font-semibold transition-all">
                  <ClipboardPaste size={14} /> Paste
                </button>
                <button onClick={() => setClipboard(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                  <List size={14} className="text-slate-400" />
                </button>
              </div>
            )}

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-48 pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5 ml-2 mr-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <List size={14} />
              </button>
            </div>
            
            <button
              onClick={() => {
                if (!activeLOB) {
                  toast.error('Please select or create a Line of Business (LOB) first.');
                  return;
                }
                navigate(currentFolderId ? `/charts/builder?folderId=${currentFolderId}` : '/charts/builder');
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-brand text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-brand-dark transition-all"
            >
              <Plus size={15} /> Chart
            </button>
          </div>
        </div>

        {/* Charts Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0a0a0f] custom-scrollbar" onClick={() => setSelectedItems([])}>
          
          {(currentFolders.length === 0 && currentCharts.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto text-slate-400">
              <FolderOpen size={48} className="mb-4 text-slate-300 dark:text-slate-800" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Folder is empty</h3>
              <p className="text-sm mb-6">Create a new chart or subfolder to get started.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Folders */}
              {currentFolders.map(folder => {
                const isSelected = selectedItems.some(i => i.type === 'folder' && i.id === folder.id);
                return (
                  <div
                    key={`folder-${folder.id}`}
                    onClick={(e) => { e.stopPropagation(); handleSelection('folder', folder.id); }}
                    onDoubleClick={(e) => { e.stopPropagation(); setCurrentFolderId(folder.id); setSelectedItems([]); }}
                    className={`group relative flex flex-col items-center p-4 rounded-xl cursor-pointer select-none transition-all ${
                      isSelected ? 'bg-brand/10 border-2 border-brand' : 'bg-white dark:bg-[#161622] border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setItemToRename({ type: 'folder', id: folder.id, name: folder.name }); setNewName(folder.name); setIsRenameModalOpen(true); }} className="p-1 text-slate-400 hover:text-brand"><Edit3 size={12} /></button>
                    </div>
                    <Folder size={40} fill="currentColor" strokeWidth={1} className="text-sky-400 mb-3" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center line-clamp-2">{folder.name}</span>
                  </div>
                );
              })}

              {/* Charts */}
              {currentCharts.map(chart => {
                const tc = getTypeConfig(chart.chart_type);
                const isSelected = selectedItems.some(i => i.type === 'chart' && i.id === chart.id);
                return (
                  <div
                    key={`chart-${chart.id}`}
                    onClick={(e) => { e.stopPropagation(); handleSelection('chart', chart.id); }}
                    onDoubleClick={(e) => { e.stopPropagation(); navigate(chart.chart_type === 'custom_template' ? `/charts/playground?id=${chart.id}` : `/charts/${chart.id}`); }}
                    className={`group relative flex flex-col items-center p-4 rounded-xl cursor-pointer select-none transition-all ${
                      isSelected ? 'bg-brand/10 border-2 border-brand' : 'bg-white dark:bg-[#161622] border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setItemToRename({ type: 'chart', id: chart.id, name: chart.title }); setNewName(chart.title); setIsRenameModalOpen(true); }} className="p-1 text-slate-400 hover:text-brand"><Edit3 size={12} /></button>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${tc.bg} ${tc.color}`}>
                      {tc.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center line-clamp-2 w-full" title={chart.title}>{chart.title}</span>
                    <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">{chart.chart_type}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161622] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-8"></th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {currentFolders.map(folder => {
                    const isSelected = selectedItems.some(i => i.type === 'folder' && i.id === folder.id);
                    return (
                      <tr 
                        key={`folder-${folder.id}`}
                        onClick={(e) => { e.stopPropagation(); handleSelection('folder', folder.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); setCurrentFolderId(folder.id); setSelectedItems([]); }}
                        className={`cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-brand/5 dark:bg-brand/10' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected} readOnly className="rounded border-slate-300 text-brand focus:ring-brand w-3.5 h-3.5" />
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <Folder size={18} fill="currentColor" strokeWidth={1} className="text-sky-400" />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{folder.name}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">Folder</td>
                        <td className="px-4 py-3 text-xs text-slate-500">-</td>
                        <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setItemToRename({ type: 'folder', id: folder.id, name: folder.name }); setNewName(folder.name); setIsRenameModalOpen(true); }} className="p-1 text-slate-400 hover:text-brand"><Edit3 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {currentCharts.map(chart => {
                    const tc = getTypeConfig(chart.chart_type);
                    const isSelected = selectedItems.some(i => i.type === 'chart' && i.id === chart.id);
                    return (
                      <tr 
                        key={`chart-${chart.id}`}
                        onClick={(e) => { e.stopPropagation(); handleSelection('chart', chart.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); navigate(chart.chart_type === 'custom_template' ? `/charts/playground?id=${chart.id}` : `/charts/${chart.id}`); }}
                        className={`cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-brand/5 dark:bg-brand/10' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected} readOnly className="rounded border-slate-300 text-brand focus:ring-brand w-3.5 h-3.5" />
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${tc.bg} ${tc.color}`}>
                            {tc.icon}
                          </div>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{chart.title}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{chart.chart_type}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(chart.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setItemToRename({ type: 'chart', id: chart.id, name: chart.title }); setNewName(chart.title); setIsRenameModalOpen(true); }} className="p-1 text-slate-400 hover:text-brand"><Edit3 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {isCreateFolderModalOpen && (
        <Modal onClose={() => setIsCreateFolderModalOpen(false)} title="New Folder" subtitle="Create in current directory">
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && newFolderName) createFolderMut.mutate(newFolderName); }}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/25 transition"
          />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setIsCreateFolderModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition">Cancel</button>
            <button onClick={() => createFolderMut.mutate(newFolderName)} disabled={!newFolderName} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:brightness-105 disabled:opacity-50 transition">Create</button>
          </div>
        </Modal>
      )}

      {isRenameModalOpen && itemToRename && (
        <Modal onClose={() => setIsRenameModalOpen(false)} title={`Rename ${itemToRename.type}`} subtitle="Update display name">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
            onKeyDown={e => { 
              if (e.key === 'Enter' && newName) {
                if(itemToRename.type === 'chart') renameChartMut.mutate({id: itemToRename.id, title: newName});
                else renameFolderMut.mutate({id: itemToRename.id, name: newName});
              } 
            }}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/25 transition"
          />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setIsRenameModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition">Cancel</button>
            <button onClick={() => {
              if(itemToRename.type === 'chart') renameChartMut.mutate({id: itemToRename.id, title: newName});
              else renameFolderMut.mutate({id: itemToRename.id, name: newName});
            }} disabled={!newName} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:brightness-105 disabled:opacity-50 transition">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string; subtitle: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/20 dark:bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full max-w-sm bg-white dark:bg-[#16161f] rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
      <p className="text-[10px] font-bold text-brand uppercase tracking-widest mb-1">{subtitle}</p>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">{title}</h3>
      {children}
    </div>
  </div>
);

export default ChartListPage;