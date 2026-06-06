import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  Check, Loader2, Home, X, SaveAll, Save
} from 'lucide-react';
import api from '../../../api';
import { useLOBStore } from '../../../store/useLOBStore';

interface ChartFolder {
  id: number;
  name: string;
  parent_id: number | null;
  lob_id: number;
}

interface SaveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, folderId: number | null) => void;
  initialTitle: string;
  initialFolderId: number | null;
  isSaving: boolean;
  isUpdating?: boolean;
}

const SaveAssetModal: React.FC<SaveAssetModalProps> = ({ 
  isOpen, onClose, onSave, initialTitle, initialFolderId, isSaving, isUpdating 
}) => {
  const { activeLOB } = useLOBStore();
  const [title, setTitle] = useState(initialTitle);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(initialFolderId);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setCurrentFolderId(initialFolderId);
    }
  }, [isOpen, initialTitle, initialFolderId]);

  const { data: folders = [], isLoading } = useQuery<ChartFolder[]>({
    queryKey: ['chart_folders', activeLOB?.id],
    queryFn: async () => {
      const res = await api.get('/api/chart-folders/', { params: { lob_id: activeLOB?.id } });
      return res.data;
    },
    enabled: !!activeLOB && isOpen
  });

  // Automatically expand folders to show the current folder path
  useEffect(() => {
    if (isOpen && currentFolderId && folders.length > 0) {
      const path = new Set<number>();
      let current = currentFolderId;
      while (current) {
        const folder = folders.find(f => f.id === current);
        if (folder && folder.parent_id) {
          path.add(folder.parent_id);
          current = folder.parent_id;
        } else {
          break;
        }
      }
      if (path.size > 0) {
        setExpandedFolders(prev => new Set([...prev, ...path]));
      }
    }
  }, [isOpen, currentFolderId, folders]);

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

  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parent_id === currentFolderId);
  }, [folders, currentFolderId]);

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
    const children = folders.filter(f => f.parent_id === parentId);
    if (!children.length) return null;

    return (
      <div className="space-y-0.5 mt-0.5">
        {children.map(folder => {
          const isSelected = currentFolderId === folder.id;
          const hasChildren = folders.some(f => f.parent_id === folder.id);
          const isExpanded = expandedFolders.has(folder.id);

          return (
            <div key={folder.id}>
              <button
                type="button"
                onClick={() => setCurrentFolderId(folder.id)}
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-slate-50 dark:bg-[#0a0a0f] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-xl">
              <SaveAll size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{isUpdating ? 'Update Chart' : 'Save Chart'}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Asset Registration & Placement</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar - Tree View */}
          <div className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Chart Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter chart name..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2 block">Folders</label>
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(null)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-all group ${
                    currentFolderId === null
                      ? 'bg-brand/10 text-brand dark:bg-brand/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Home size={14} className="shrink-0" />
                  <span>Root Directory</span>
                </button>

                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="animate-spin text-brand" size={20} />
                  </div>
                ) : (
                  <div className="mt-1">
                    {renderSidebarTree(null, 0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Pane - Grid View */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0a0a0f]">
            {/* Breadcrumbs */}
            <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-6 flex items-center shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setCurrentFolderId(null)}
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
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={`font-semibold transition-colors max-w-[150px] truncate px-2 py-1 rounded-md ${
                        currentFolderId === folder.id ? 'bg-brand text-white' : 'text-slate-500 dark:text-slate-400 hover:text-brand hover:bg-brand/5'
                      }`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Folder Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {currentFolders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto text-slate-400">
                  <FolderOpen size={48} className="mb-4 text-slate-300 dark:text-slate-800" />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No Subfolders</h3>
                  <p className="text-sm">This directory does not contain any subfolders.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {currentFolders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="group flex flex-col items-center p-6 bg-white dark:bg-[#161622] rounded-xl cursor-pointer select-none transition-all border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
                    >
                      <Folder size={48} fill="currentColor" strokeWidth={1} className="text-sky-400 mb-3" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center line-clamp-2">{folder.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-[11px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(title, currentFolderId)}
            disabled={isSaving || !title.trim()}
            className="px-6 py-2 bg-brand text-white rounded-lg font-bold text-[11px] uppercase tracking-widest shadow-md shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Confirm & {isUpdating ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveAssetModal;
