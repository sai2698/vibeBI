import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import CodeMirror from '@uiw/react-codemirror';
import { sql, StandardSQL, MySQL, PostgreSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../api';
import { useThemeStore } from '../../store/useThemeStore';
import {
  Play, Download, AlertCircle, Table2, Terminal, Database,
  Columns, ChevronRight, Loader2, RefreshCw, Layers, Search,
  History as HistoryIcon, Plus, X, FileCode2, Save, Trash2, FolderOpen, ChevronDown, Edit3, FolderPlus, Folder, ArrowLeft
} from 'lucide-react';

/* ─── Types ─── */
interface SQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
  execution_time_ms: number;
  error: string | null;
}
interface Datasource { id: number; name: string; engine: string; }
interface Column { name: string; type: string; }
interface TableResponse { tables: string[]; total_count: number; page: number; page_size: number; }
interface SavedQuery {
  id: number;
  name: string;
  sql: string;
  datasource_id: number;
  schema_name?: string;
  folder?: string;
}
interface FolderInfo {
  name: string;
  description?: string;
  query_count: number;
}
interface QueryTab {
  id: string;
  title: string;
  query: string;
  result: SQLResult | null;
  isRunning: boolean;
  savedQueryId?: number;
  folder?: string;
}

let tabCounter = 1;
const makeTab = (): QueryTab => ({
  id: `tab-${Date.now()}-${tabCounter++}`,
  title: `Query ${tabCounter - 1}`,
  query: `-- Query ${tabCounter - 1}\nSELECT * \nFROM information_schema.tables \nLIMIT 100;`,
  result: null,
  isRunning: false,
});

const CustomDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  icon: Icon,
  isLoading 
}: { 
  value: string | number | null, 
  onChange: (v: any) => void, 
  options: { value: string | number, label: string }[], 
  placeholder: string,
  icon?: React.ElementType,
  isLoading?: boolean
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative w-full group">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg focus:ring-2 focus:ring-brand/20 hover:border-brand/40 dark:hover:border-brand/40 transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading ? <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" /> : Icon && <Icon size={14} className="text-brand shrink-0" />}
          <span className={`text-xs font-semibold truncate ${selectedOption ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : 'group-hover:text-brand'}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl shadow-slate-900/10 dark:shadow-black/40 py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => { onChange(null); setIsOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            {placeholder}
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                value === opt.value 
                  ? 'bg-brand/10 text-brand dark:text-brand' 
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Component ─── */
const SQLLabPage: React.FC = () => {
  const { mode } = useThemeStore();
  const [tabs, setTabs] = useState<QueryTab[]>([makeTab()]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [datasourceId, setDatasourceId] = useState<number | null>(null);
  const [schema, setSchema] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'db' | 'queries'>('db');
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tableColumns, setTableColumns] = useState<Record<string, Column[]>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  /* Pagination for results */
  const [resultPage, setResultPage] = useState(1);
  const RESULT_PAGE_SIZE = 50;

  useEffect(() => {
    setResultPage(1);
  }, [activeTabId]);
  
  /* Save Dialog state */
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveFolder, setSaveFolder] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editQueryId, setEditQueryId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editFolder, setEditFolder] = useState('');
  
  /* Folder management */
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editFolderOldName, setEditFolderOldName] = useState<string | null>(null);
  const [editFolderNewName, setEditFolderNewName] = useState('');
  const [createdFolders, setCreatedFolders] = useState<Set<string>>(new Set());
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  
  /* resizable state */
  const [sidebarW, setSidebarW] = useState(260);
  const [editorH, setEditorH] = useState(45); // percent
  const [dragging, setDragging] = useState<'h' | 'v' | null>(null);
  const vContainerRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  /* ─── Data fetching ─── */
  const { data: datasources, isLoading: isLoadingDs, refetch: refetchDs } = useQuery<Datasource[]>({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get('/api/datasources/')).data,
    retry: 1,
  });

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery<string[]>({
    queryKey: ['schemas', datasourceId],
    queryFn: async () => {
      if (!datasourceId) return [];
      return (await api.get(`/api/sqllab/schemas?datasource_id=${datasourceId}`)).data;
    },
    enabled: !!datasourceId,
  });

  const { data: tableData, isLoading: isLoadingTables, refetch: refetchTables } = useQuery<TableResponse>({
    queryKey: ['schema-tables', datasourceId, schema, tableSearch, tablePage],
    queryFn: async () => {
      if (!datasourceId) return { tables: [], total_count: 0, page: 1, page_size: 50 };
      let url = `/api/sqllab/tables?datasource_id=${datasourceId}&page=${tablePage}&page_size=50`;
      if (schema) url += `&schema=${schema}`;
      if (tableSearch) url += `&search=${tableSearch}`;
      return (await api.get(url)).data;
    },
    enabled: !!datasourceId,
    retry: 1,
  });

  const { data: savedQueries, refetch: refetchSaved } = useQuery<SavedQuery[]>({
    queryKey: ['saved-queries'],
    queryFn: async () => (await api.get('/api/sqllab/saved')).data,
  });

  const { data: apiFolders, refetch: refetchFolders } = useQuery<FolderInfo[]>({
    queryKey: ['saved-folders'],
    queryFn: async () => {
      const response = await api.get('/api/sqllab/folders');
      console.log('Fetched folders from API:', response.data);
      return response.data;
    },
    enabled: !!savedQueries, // Only fetch folders after saved queries are loaded
  });

  // Combine API folders with locally created folders
  const folders = useMemo(() => {
    const folderMap = new Map<string, FolderInfo>();
    
    // Add API folders
    apiFolders?.forEach(f => {
      folderMap.set(f.name, f);
    });
    
    // Add locally created folders (even if not in API yet)
    createdFolders.forEach(name => {
      if (!folderMap.has(name)) {
        folderMap.set(name, { name, description: undefined, query_count: 0 });
      }
    });
    
    return Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [apiFolders, createdFolders]);

  const { data: dbMetadata } = useQuery<Record<string, string[]>>({
    queryKey: ['datasource-metadata', datasourceId, schema],
    queryFn: async () => {
      if (!datasourceId) return {};
      let url = `/api/sqllab/metadata?datasource_id=${datasourceId}`;
      if (schema) url += `&schema=${schema}`;
      return (await api.get(url)).data;
    },
    enabled: !!datasourceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SavedQuery>) => {
      if (activeTab.savedQueryId) {
        return (await api.patch(`/api/sqllab/saved/${activeTab.savedQueryId}`, data)).data;
      }
      return (await api.post('/api/sqllab/saved', { ...data, sql: activeTab.query, datasource_id: datasourceId, schema_name: schema })).data;
    },
    onSuccess: (data) => {
      toast.success('Query saved');
      // Add the folder to created folders if it exists
      if (data?.folder) {
        setCreatedFolders(prev => new Set([...prev, data.folder]));
      }
      refetchSaved();
      refetchFolders();
      updateActiveTab({ title: data.name, savedQueryId: data.id, folder: data.folder });
      setIsSaveModalOpen(false);
    }
  });

  const deleteSavedMutation = useMutation({
    mutationFn: async (id: number) => await api.delete(`/api/sqllab/saved/${id}`),
    onSuccess: () => {
      toast.success('Query deleted');
      refetchSaved();
      refetchFolders();
    }
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/api/sqllab/folders', { name });
      console.log('Create folder response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      const folderName = data?.name || newFolderName;
      toast.success(`Folder "${folderName}" created! Save a query to this folder to use it.`);
      setCreatedFolders(prev => new Set([...prev, folderName]));
      refetchFolders();
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create folder');
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folder: string) => await api.delete('/api/sqllab/folders', { params: { folder } }),
    onSuccess: () => {
      toast.success('Folder deleted');
      setCreatedFolders(prev => {
        const updated = new Set(prev);
        updated.delete(folderToDelete || '');
        return updated;
      });
      refetchFolders();
      refetchSaved();
      setFolderToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete folder');
    }
  });

  const updateQueryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SavedQuery> }) => 
      await api.patch(`/api/sqllab/saved/${id}`, data),
    onSuccess: (responseData) => {
      toast.success('Query updated');
      // Add the folder from the saved query to created folders if it exists
      if (responseData?.folder) {
        setCreatedFolders(prev => new Set([...prev, responseData.folder]));
      }
      refetchSaved();
      refetchFolders();
      setIsEditModalOpen(false);
    }
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => 
      await api.patch('/api/sqllab/folders', { old_name: oldName, new_name: newName }),
    onSuccess: () => {
      toast.success('Folder renamed');
      // Update created folders set
      if (editFolderOldName) {
        setCreatedFolders(prev => {
          const updated = new Set(prev);
          updated.delete(editFolderOldName);
          updated.add(editFolderNewName);
          return updated;
        });
      }
      refetchFolders();
      refetchSaved();
      setIsEditFolderModalOpen(false);
      setEditFolderOldName(null);
      setEditFolderNewName('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to rename folder');
    }
  });

  const fetchColumns = async (tableName: string) => {
    if (tableColumns[tableName]) return;
    try {
      let url = `/api/sqllab/table-columns?datasource_id=${datasourceId}&table_name=${tableName}`;
      if (schema) url += `&schema=${schema}`;
      const res = await api.get(url);
      setTableColumns(prev => ({ ...prev, [tableName]: res.data }));
    } catch (err) {
      toast.error(`Failed to fetch columns for ${tableName}`);
    }
  };

  // Removed auto-select datasource for production "on-demand" feel
  /*
  useEffect(() => {
    if (!datasourceId && datasources?.length) setDatasourceId(datasources[0].id);
  }, [datasources, datasourceId]);
  */

  useEffect(() => {
    setSchema(null);
    setTableSearch('');
    setTablePage(1);
    setTableColumns({});
    setExpandedTables({});
  }, [datasourceId]);

  useEffect(() => {
    setTablePage(1);
    setExpandedTables({});
  }, [schema, tableSearch]);

  /* ─── Tab helpers ─── */
  const updateActiveTab = useCallback(
    (patch: Partial<QueryTab>) =>
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t))),
    [activeTabId],
  );

  const addTab = (saved?: SavedQuery) => {
    const t = saved ? {
        id: `tab-${Date.now()}-${tabCounter++}`,
        title: saved.name,
        query: saved.sql,
        result: null,
        isRunning: false,
        savedQueryId: saved.id,
        folder: saved.folder
    } : makeTab();
    
    if (saved) {
        setDatasourceId(saved.datasource_id);
        setSchema(saved.schema_name || null);
    }
    
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (!next.length) {
        const t = makeTab();
        next.push(t);
      }
      if (activeTabId === id) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  };

  /* ─── Execute ─── */
  const executeMutation = useMutation<SQLResult, Error, void>({
    mutationFn: async () => {
      if (!datasourceId) throw new Error('Select a datasource first');
      updateActiveTab({ isRunning: true });
      return (
        await api.post('/api/sqllab/execute', {
          datasource_id: datasourceId,
          query: activeTab.query,
          limit: 1000,
        })
      ).data;
    },
    onSuccess: (data) => {
      updateActiveTab({ result: data, isRunning: false });
      setResultPage(1);
    },
    onError: (err: any) => {
      updateActiveTab({ isRunning: false });
      toast.error(`Query failed: ${err.response?.data?.detail || err.message}`);
    },
  });

  const handleExecute = useCallback(() => executeMutation.mutate(), [executeMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute],
  );

  const toggleTable = (n: string) => {
    const isExpanding = !expandedTables[n];
    setExpandedTables((p) => ({ ...p, [n]: isExpanding }));
    if (isExpanding) fetchColumns(n);
  };

  /* ─── Resize handlers ─── */
  const startHResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging('h');
      const x0 = e.clientX;
      const w0 = sidebarW;
      const move = (ev: MouseEvent) => setSidebarW(Math.max(180, Math.min(480, w0 + ev.clientX - x0)));
      const up = () => { setDragging(null); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [sidebarW],
  );

  const startVResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging('v');
      const el = vContainerRef.current;
      if (!el) return;
      const totalH = el.getBoundingClientRect().height;
      const y0 = e.clientY;
      const pct0 = editorH;
      const move = (ev: MouseEvent) => setEditorH(Math.max(15, Math.min(85, pct0 + ((ev.clientY - y0) / totalH) * 100)));
      const up = () => { setDragging(null); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [editorH],
  );

  const sqlExtension = useMemo(() => {
    let dialect = StandardSQL;
    if (datasourceId && datasources) {
      const ds = datasources.find((d) => d.id === datasourceId);
      if (ds?.engine?.toLowerCase().includes('mysql')) {
        dialect = MySQL;
      } else if (ds?.engine?.toLowerCase().includes('postgresql')) {
        dialect = PostgreSQL;
      }
    }

    return sql({
      dialect,
      schema: dbMetadata || {},
      upperCaseKeywords: true,
    });
  }, [dbMetadata, datasourceId, datasources]);

  const result = activeTab.result;

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div
      className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300"
      onKeyDown={handleKeyDown}
      style={{ userSelect: dragging ? 'none' : 'auto' }}
    >
      {/* ─── Toolbar ─── */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand/10 text-brand"><Terminal size={18} /></div>
            <h1 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight transition-colors">SQL Lab</h1>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Datasource picker */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <CustomDropdown
              value={datasourceId}
              onChange={(val) => setDatasourceId(val)}
              options={datasources?.map(ds => ({ value: ds.id, label: `${ds.name} (${ds.engine})` })) || []}
              placeholder="Select Datasource..."
              icon={Database}
              isLoading={isLoadingDs}
            />
            <button onClick={() => refetchDs()} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-400 dark:text-slate-500 transition-all shrink-0" title="Refresh Datasources">
              <RefreshCw size={14} className={isLoadingDs ? 'animate-spin text-brand' : ''} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
                if (activeTab.savedQueryId) {
                    saveMutation.mutate({ sql: activeTab.query });
                } else {
                    setSaveName(activeTab.title);
                    setIsSaveModalOpen(true);
                }
            }}
            disabled={!datasourceId}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
          >
            <Save size={14} />
            {activeTab.savedQueryId ? 'Save' : 'Save As'}
          </button>
          {activeTab.savedQueryId && (
            <button
              onClick={() => {
                  setSaveName(activeTab.title);
                  setSaveFolder(activeTab.folder || '');
                  setIsSaveModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
              title="Edit Details"
            >
              <Edit3 size={14} />
            </button>
          )}
          <kbd className="hidden md:flex items-center px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">⌘ Enter</kbd>
          <button
            onClick={handleExecute}
            disabled={activeTab.isRunning || !datasourceId}
            className="flex items-center gap-2 px-5 py-2 bg-brand text-white rounded-lg text-sm font-bold shadow shadow-brand/20 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {activeTab.isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            Run
          </button>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-white dark:bg-slate-950">
        {/* ── Sidebar: Schema Explorer ── */}
        <div className="shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden" style={{ width: sidebarW }}>
          {/* Sidebar Tabs */}
          <div className="flex p-1.5 gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50">
            <button 
              onClick={() => setSidebarTab('db')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${sidebarTab === 'db' ? 'bg-white dark:bg-slate-800 text-brand shadow-sm border border-slate-200/50 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
            >
              Database
            </button>
            <button 
              onClick={() => setSidebarTab('queries')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${sidebarTab === 'queries' ? 'bg-white dark:bg-slate-800 text-brand shadow-sm border border-slate-200/50 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
            >
              Saved Queries
            </button>
          </div>

          {sidebarTab === 'db' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Schema Selector */}
              <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-slate-400">
                   <Layers size={12} className="text-brand" /> Schema
                </label>
                <CustomDropdown
                  value={schema}
                  onChange={(val) => setSchema(val)}
                  options={schemas?.map(s => ({ value: s, label: s })) || []}
                  placeholder="Default / All"
                  icon={Layers}
                  isLoading={isLoadingSchemas}
                />
              </div>

              <div className="shrink-0 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Table2 size={13} className="text-brand" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tables</span>
                    {tableData && <span className="text-[9px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-bold">{tableData.total_count}</span>}
                  </div>
                  <button onClick={() => refetchTables()} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400" title="Refresh">
                    <RefreshCw size={11} className={isLoadingTables ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                {datasourceId && (
                  <div className="relative group">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search tables..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-medium focus:ring-2 focus:ring-brand/10 focus:border-brand/40 outline-none transition-all text-slate-700 dark:text-slate-300"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-px custom-scrollbar">
                {isLoadingTables ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-2 text-slate-400">
                    <Loader2 size={24} className="animate-spin text-brand" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Loading…</span>
                  </div>
                ) : !datasourceId ? (
                  <div className="flex flex-col items-center justify-center py-14 text-slate-300 gap-2 px-4 text-center">
                    <Database size={30} />
                    <p className="text-[10px] font-semibold">Select a datasource</p>
                  </div>
                ) : !tableData?.tables?.length ? (
                  <div className="flex flex-col items-center justify-center py-14 text-slate-300 gap-2 px-4 text-center">
                    <Search size={30} />
                    <p className="text-[10px] font-semibold">No tables found</p>
                  </div>
                ) : (
                  <div className="space-y-px">
                    {tableData.tables.map((tableName) => (
                      <div key={tableName}>
                        <button
                          onClick={() => toggleTable(tableName)}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                        >
                          <ChevronRight size={13} className={`text-slate-400 dark:text-slate-500 transition-transform duration-150 ${expandedTables[tableName] ? 'rotate-90' : ''}`} />
                          <Table2 size={14} className="text-brand/50 group-hover:text-brand transition-colors" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate">{tableName}</span>
                        </button>
                        {expandedTables[tableName] && (
                          <div className="ml-6 mb-1 border-l-2 border-slate-200 dark:border-slate-800 pl-2.5 space-y-px animate-in slide-in-from-left-1 duration-150">
                            {!tableColumns[tableName] ? (
                              <div className="flex items-center gap-2 py-1 text-[9px] text-slate-400 dark:text-slate-500">
                                <Loader2 size={10} className="animate-spin" />
                                <span>Fetching columns...</span>
                              </div>
                            ) : tableColumns[tableName].map((c) => (
                              <div key={c.name} className="flex items-center justify-between px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors group/col">
                                <div className="flex items-center gap-1.5">
                                  <Columns size={10} className="text-slate-300 dark:text-slate-700 group-hover/col:text-brand transition-colors" />
                                  <span className="font-medium">{c.name}</span>
                                </div>
                                <span className="text-[8px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 py-px rounded uppercase">{c.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Pagination Controls */}
                    {tableData.total_count > 50 && (
                      <div className="flex items-center justify-between px-2 py-4 border-t border-slate-100 mt-2">
                        <button 
                          disabled={tablePage === 1}
                          onClick={() => setTablePage(p => p - 1)}
                          className="p-1 text-[10px] font-bold text-slate-400 hover:text-brand disabled:opacity-30 transition-colors flex items-center gap-1"
                        >
                          Prev
                        </button>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          Page {tablePage} of {Math.ceil(tableData.total_count / 50)}
                        </span>
                        <button 
                          disabled={tablePage >= Math.ceil(tableData.total_count / 50)}
                          onClick={() => setTablePage(p => p + 1)}
                          className="p-1 text-[10px] font-bold text-slate-400 hover:text-brand disabled:opacity-30 transition-colors flex items-center gap-1"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-slate-950">
              {/* Folders Header with Create Button */}
              <div className="shrink-0 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen size={13} className="text-brand" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Folders & Queries</span>
                  </div>
                  <button 
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="p-1 text-slate-400 hover:text-brand transition-colors"
                    title="Create Folder"
                  >
                    <FolderPlus size={12} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search folders or queries..."
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-medium focus:ring-2 focus:ring-brand/10 focus:border-brand/40 outline-none transition-all text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Folders and Queries Tree */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {(() => {
                    const folderGroups: Record<string, SavedQuery[]> = {};
                    const root: SavedQuery[] = [];
                    savedQueries?.forEach(q => {
                        if (q.folder) {
                            if (!folderGroups[q.folder]) folderGroups[q.folder] = [];
                            folderGroups[q.folder].push(q);
                        } else {
                            root.push(q);
                        }
                    });

                    const searchLower = folderSearchQuery.toLowerCase();
                    
                    // Filter root queries
                    const filteredRoot = root.filter(q => 
                      q.name.toLowerCase().includes(searchLower)
                    );

                    // Filter folders - show if folder name matches OR if it has queries that match
                    const filteredFolders = folders?.filter(f => {
                      const folderMatches = f.name.toLowerCase().includes(searchLower);
                      const folderQueries = folderGroups[f.name] || [];
                      const hasMatchingQueries = folderQueries.some(q => 
                        q.name.toLowerCase().includes(searchLower)
                      );
                      return folderMatches || hasMatchingQueries;
                    }) || [];

                    return (
                        <div className="space-y-1">
                          {/* Root Level Queries (No Folder) */}
                          {filteredRoot.length > 0 && (
                            <div className="space-y-px">
                              {filteredRoot.map(q => (
                                <div key={q.id} className="group/item flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer transition-all" onClick={() => addTab(q)}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileCode2 size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{q.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setEditQueryId(q.id);
                                        setEditName(q.name);
                                        setEditFolder(q.folder || '');
                                        setIsEditModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-brand transition-colors"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deleteSavedMutation.mutate(q.id); }}
                                      className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Folders and their queries */}
                          {filteredFolders.map((folderInfo) => {
                            const folderQueries = folderGroups[folderInfo.name] || [];
                            const filteredFolderQueries = folderQueries.filter(q => 
                              q.name.toLowerCase().includes(searchLower)
                            );
                            const isExpanded = expandedFolders[folderInfo.name] ?? true;

                            return (
                              <div key={folderInfo.name} className="space-y-px">
                                <button 
                                  onClick={() => setExpandedFolders(p => ({ ...p, [folderInfo.name]: !isExpanded }))}
                                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                >
                                  <div className="flex items-center gap-2">
                                    <ChevronRight size={13} className={`text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    <FolderOpen size={13} className="text-brand/60 group-hover:text-brand transition-colors" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{folderInfo.name}</span>
                                    <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 rounded-full font-bold">
                                      {filteredFolderQueries.length}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditFolderOldName(folderInfo.name);
                                        setEditFolderNewName(folderInfo.name);
                                        setIsEditFolderModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-brand transition-colors"
                                      title="Edit folder name"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFolderToDelete(folderInfo.name);
                                      }}
                                      className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                                      title="Delete folder"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </button>

                                {/* Folder Queries - Tree indented */}
                                {isExpanded && filteredFolderQueries.length > 0 && (
                                  <div className="ml-4 border-l-2 border-slate-200 dark:border-slate-800 pl-2 space-y-px animate-in slide-in-from-left-1 duration-150">
                                    {filteredFolderQueries.map(q => (
                                      <div key={q.id} className="group/item flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer transition-all" onClick={() => addTab(q)}>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileCode2 size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{q.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                          <button 
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              setEditQueryId(q.id);
                                              setEditName(q.name);
                                              setEditFolder(q.folder || '');
                                              setIsEditModalOpen(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-brand transition-colors"
                                          >
                                            <Edit3 size={11} />
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); deleteSavedMutation.mutate(q.id); }}
                                            className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {isExpanded && filteredFolderQueries.length === 0 && (
                                  <div className="ml-4 px-2 py-1.5 text-[9px] text-slate-400 dark:text-slate-500 italic">
                                    No queries match search
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Empty state */}
                          {(!savedQueries || savedQueries.length === 0) && (!folders || folders.length === 0) && (
                            <div className="py-10 text-center space-y-2 opacity-30">
                              <FileCode2 size={40} className="mx-auto" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">No saved queries</p>
                            </div>
                          )}

                          {/* No search results */}
                          {folderSearchQuery && filteredRoot.length === 0 && filteredFolders.length === 0 && (
                            <div className="py-10 text-center space-y-2 opacity-30">
                              <Search size={40} className="mx-auto" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">No results found</p>
                            </div>
                          )}
                        </div>
                    );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ── H-Resize handle ── */}
        <div
          onMouseDown={startHResize}
          className={`shrink-0 w-1 -ml-1 z-10 cursor-col-resize transition-colors ${dragging === 'h' ? 'bg-brand' : 'hover:bg-brand/50 bg-transparent'}`}
        />

        {/* ── Right pane: tabs + editor + results ── */}
        <div ref={vContainerRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white dark:bg-slate-950">
          {/* Tab bar */}
          <div className="shrink-0 flex items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-1 overflow-x-auto custom-scrollbar">
            {tabs.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`group flex items-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer border-b-2 transition-all whitespace-nowrap ${t.id === activeTabId
                    ? 'text-brand border-brand bg-white dark:bg-slate-950'
                    : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
              >
                <FileCode2 size={12} className={t.id === activeTabId ? 'text-brand' : 'text-slate-400'} />
                {t.title}
                {t.isRunning && <Loader2 size={10} className="animate-spin text-brand" />}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                    className="ml-1 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => addTab()} className="p-1.5 ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-brand transition-colors" title="New query tab">
              <Plus size={14} />
            </button>
          </div>

          {/* Editor pane — uses flex-basis so it never changes when results load */}
          <div className="shrink-0 overflow-hidden relative" style={{ flex: `0 0 ${editorH}%` }}>
            <CodeMirror
              value={activeTab.query}
              height="100%"
              theme={mode === 'dark' ? oneDark : 'light'}
              extensions={[sqlExtension]}
              onChange={(v) => updateActiveTab({ query: v })}
              className="absolute inset-0 text-[13px] [&_.cm-editor]:!h-full [&_.cm-scroller]:!overflow-auto"
              basicSetup={{ 
                lineNumbers: true, 
                foldGutter: true, 
                highlightActiveLine: true, 
                autocompletion: true,
                completionKeymap: true,
                closeBrackets: true
              }}
            />
          </div>

          {/* V-Resize handle */}
          <div
            onMouseDown={startVResize}
            className={`shrink-0 h-1 z-10 cursor-row-resize transition-colors ${dragging === 'v' ? 'bg-brand' : 'hover:bg-brand/50 bg-slate-200'}`}
          />

          {/* Results pane — flex-1 fills remaining space, min-h-0 enables scroll */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {/* Results header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Table2 size={14} className="text-brand" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Results</span>
                {result && !result.error && (
                  <span className="text-[10px] font-semibold text-slate-400 ml-1">
                    {result.rows.length} rows • {result.execution_time_ms.toFixed(0)}ms
                  </span>
                )}
              </div>
              {result && !result.error && result.rows.length > 0 && (
                <button className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-all">
                  <Download size={10} /> Export
                </button>
              )}
            </div>

            {/* Results body — scroll both axes, table never pushes layout */}
            <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar relative">
              {activeTab.isRunning ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3 p-6">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 border-[3px] border-slate-200 dark:border-slate-800 rounded-full" />
                      <div className="absolute inset-0 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Executing…</p>
                  </div>
                </div>
              ) : result?.error ? (
                <div className="p-4">
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-red-100/60 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/30 flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
                      <span className="font-bold text-xs text-red-800 dark:text-red-300">Error</span>
                    </div>
                    <pre className="p-4 text-[11px] text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap">{result.error}</pre>
                  </div>
                </div>
              ) : result && result.columns.length > 0 ? (
                <table className="text-left border-collapse table-auto w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center w-10 border-r border-slate-100 dark:border-slate-800">#</th>
                      {result.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap border-r border-slate-100 dark:border-slate-800 last:border-r-0">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-mono text-[11px]">
                    {result.rows.length > 0 ? (
                      result.rows.slice((resultPage - 1) * RESULT_PAGE_SIZE, resultPage * RESULT_PAGE_SIZE).map((row, i) => (
                        <tr key={i} className="hover:bg-brand/[0.02] dark:hover:bg-brand/10 transition-colors">
                          <td className="px-3 py-1.5 text-center text-slate-300 dark:text-slate-500 border-r border-slate-50 dark:border-slate-800/50 text-[10px]">{(resultPage - 1) * RESULT_PAGE_SIZE + i + 1}</td>
                          {result.columns.map((col) => (
                            <td key={col} className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300 border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 max-w-[300px] truncate">
                              {row[col] === null ? <span className="text-slate-300 dark:text-slate-600 italic">NULL</span> : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={result.columns.length + 1} className="py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5">
                            <Search size={28} className="opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">0 rows returned</p>
                            <p className="text-[9px] text-slate-400 font-medium italic">Query executed successfully but produced no data</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : result ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <div className="p-3 bg-slate-50 rounded-full text-emerald-500">
                    <HistoryIcon size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Query Successful</p>
                    <p className="text-[10px] text-slate-400 font-medium">Command executed without errors • {result.execution_time_ms.toFixed(0)}ms</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full opacity-15">
                  <div className="text-center">
                    <Terminal size={40} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-bold text-slate-500">Ready</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Run a query to see results</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {result && !result.error && result.rows.length > RESULT_PAGE_SIZE && (
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button 
                  disabled={resultPage === 1}
                  onClick={() => setResultPage(p => p - 1)}
                  className="px-3 py-1 rounded-md text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  Prev
                </button>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Page {resultPage} of {Math.ceil(result.rows.length / RESULT_PAGE_SIZE)}
                </span>
                <button 
                  disabled={resultPage >= Math.ceil(result.rows.length / RESULT_PAGE_SIZE)}
                  onClick={() => setResultPage(p => p + 1)}
                  className="px-3 py-1 rounded-md text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">Save Query</h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Query Name</label>
                <input 
                  type="text" 
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                  placeholder="e.g. Sales Report Q1"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Folder (Optional)</label>
                {folders && folders.length > 0 ? (
                  <CustomDropdown
                    value={saveFolder || null}
                    onChange={(val) => setSaveFolder(val || '')}
                    options={folders.map(f => ({ value: f.name, label: f.name }))}
                    placeholder="No folder (root)"
                    icon={Folder}
                  />
                ) : (
                  <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 flex items-center gap-2">
                    <Folder size={14} className="text-slate-300" />
                    <span className="font-semibold">No folders yet. Create a folder first!</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                onClick={() => saveMutation.mutate({ name: saveName, folder: saveFolder, sql: activeTab.query, datasource_id: datasourceId, schema_name: schema })}
                disabled={!saveName || saveMutation.isPending}
                className="px-6 py-2 bg-brand text-white text-xs font-bold rounded-xl shadow-lg shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
              >
                {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Query
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Query Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">Edit Query</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Query Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                  placeholder="Query name"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Folder</label>
                {folders && folders.length > 0 ? (
                  <CustomDropdown
                    value={editFolder || null}
                    onChange={(val) => setEditFolder(val || '')}
                    options={folders.map(f => ({ value: f.name, label: f.name }))}
                    placeholder="No folder (root)"
                    icon={Folder}
                  />
                ) : (
                  <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 flex items-center gap-2">
                    <Folder size={14} className="text-slate-300" />
                    <span className="font-semibold">No folders yet. Create a folder first!</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                onClick={() => editQueryId && updateQueryMutation.mutate({ id: editQueryId, data: { name: editName, folder: editFolder || null } })}
                disabled={!editName || updateQueryMutation.isPending}
                className="px-6 py-2 bg-brand text-white text-xs font-bold rounded-xl shadow-lg shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
              >
                {updateQueryMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">Create Folder</h3>
              <button onClick={() => setIsCreateFolderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Folder Name</label>
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                  placeholder="e.g. Reports"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && newFolderName) createFolderMutation.mutate(newFolderName); }}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsCreateFolderModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                onClick={() => newFolderName && createFolderMutation.mutate(newFolderName)}
                disabled={!newFolderName || createFolderMutation.isPending}
                className="px-6 py-2 bg-brand text-white text-xs font-bold rounded-xl shadow-lg shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
              >
                {createFolderMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
              <h3 className="text-sm font-extrabold text-red-600">Delete Folder</h3>
              <button onClick={() => setFolderToDelete(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to delete folder "<span className="font-bold">{folderToDelete}</span>"? 
                All queries in this folder will be moved to the root directory.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setFolderToDelete(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                onClick={() => deleteFolderMutation.mutate(folderToDelete)}
                disabled={deleteFolderMutation.isPending}
                className="px-6 py-2 bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all flex items-center gap-2"
              >
                {deleteFolderMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {isEditFolderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">Rename Folder</h3>
              <button onClick={() => setIsEditFolderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Folder Name</label>
                <input 
                  type="text"
                  value={editFolderNewName}
                  onChange={(e) => setEditFolderNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editFolderNewName && editFolderOldName) {
                      renameFolderMutation.mutate({ oldName: editFolderOldName, newName: editFolderNewName });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                  placeholder="New folder name"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditFolderModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button 
                onClick={() => editFolderOldName && renameFolderMutation.mutate({ oldName: editFolderOldName, newName: editFolderNewName })}
                disabled={!editFolderNewName || renameFolderMutation.isPending}
                className="px-6 py-2 bg-brand text-white text-xs font-bold rounded-xl shadow-lg shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
              >
                {renameFolderMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SQLLabPage;
