import React, { useState } from 'react';
import { 
  X, Filter, Plus, Save, Database, Type, Calendar, Trash2, 
  Settings2, Info, ChevronDown, ChevronRight, GripVertical, Check
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { useLOBStore } from '../../store/useLOBStore';

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

interface DashboardFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterDef[];
  onSave: (filters: FilterDef[]) => void;
}

interface CustomSelectProps<T> {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
}

const CustomSelect = <T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  leftIcon,
}: CustomSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full">
      {isOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-3 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-left font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          {leftIcon}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DashboardFiltersPanel: React.FC<DashboardFiltersPanelProps> = ({ isOpen, onClose, filters, onSave }) => {
  const [localFilters, setLocalFilters] = useState<FilterDef[]>(filters);
  const [expandedFilterIds, setExpandedFilterIds] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [draggableIndex, setDraggableIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'advanced'>('config');
  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  const { data: availableDatasets } = useQuery<any[]>({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => {
      const response = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } });
      return response.data;
    },
    enabled: isOpen
  });

  React.useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  const handleAddFilter = () => {
    const newId = `f_${Date.now()}`;
    const newFilter: FilterDef = {
      id: newId,
      label: '',
      column: '',
      type: 'text',
      source: 'static',
      options: []
    };
    setLocalFilters([...localFilters, newFilter]);
    setExpandedFilterIds(prev => ({ ...prev, [newId]: true }));
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = [...localFilters];
    newFilters.splice(index, 1);
    setLocalFilters(newFilters);
  };

  const updateFilter = (index: number, updates: Partial<FilterDef>) => {
    const newFilters = [...localFilters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setLocalFilters(newFilters);
  };

  const toggleExpand = (id: string) => {
    setExpandedFilterIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };



  const expandAll = () => {
    const expanded: Record<string, boolean> = {};
    localFilters.forEach(f => {
      expanded[f.id] = true;
    });
    setExpandedFilterIds(expanded);
  };

  const collapseAll = () => {
    setExpandedFilterIds({});
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;
    if (draggedOverIndex !== index) {
      setDraggedOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDraggedOverIndex(null);
      return;
    }

    const items = [...localFilters];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    setLocalFilters(items);
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleApply = () => {
    onSave(localFilters);
  };



  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out border-l border-slate-200/60 dark:border-slate-800 flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-2.5 text-slate-800 dark:text-white">
          <div className="p-1.5 bg-brand/10 text-brand rounded-lg">
            <Filter size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wide block leading-tight">Dashboard Filters</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.12em] block mt-0.5 leading-tight">Interaction Controller</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 pt-2 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 z-10 sticky top-[73px]">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'config'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Configure Controls
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'advanced'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Defaults & Restrictions
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        
        {activeTab === 'config' ? (
          <>
            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 text-blue-800 dark:text-blue-300 p-3 rounded-xl flex gap-2">
              <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed font-semibold">
                Rearrange filters by dragging the <strong>Grip Handle</strong>.
              </p>
            </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Filter Controls</span>
            <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-extrabold rounded-full">
              {localFilters.length}
            </span>
          </div>
          {localFilters.length > 0 && (
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={expandAll}
                className="text-[10px] font-black uppercase tracking-wider text-brand hover:text-brand-dark transition-colors"
              >
                Expand All
              </button>
              <span className="text-slate-300 text-[10px] font-bold">|</span>
              <button 
                type="button" 
                onClick={collapseAll}
                className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Filter Cards List */}
        <div className="space-y-3.5">
          {localFilters.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center shadow-sm">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 mb-3 border border-slate-100">
                <Settings2 size={24} />
              </div>
              <h4 className="text-xs font-bold text-slate-700">No active filters configured</h4>
              <p className="text-[10px] text-slate-400 max-w-[240px] mt-1 leading-normal">
                Configure global filters to enable live interactive controls across all dashboard charts.
              </p>
            </div>
          ) : (
            localFilters.map((f, idx) => {
              const isExpanded = !!expandedFilterIds[f.id];
              const isDragging = draggedIndex === idx;
              const isDraggedOver = draggedOverIndex === idx;

              return (
                <React.Fragment key={f.id}>
                  <div 
                    draggable={draggableIndex === idx}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnter={handleDragEnter}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 relative ${
                      isExpanded ? 'z-30 shadow-md' : 'z-10'
                    } ${
                      isDragging 
                        ? 'opacity-30 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50 scale-[0.98] shadow-inner' 
                        : isDraggedOver
                          ? 'border-brand bg-brand/5 shadow-lg shadow-brand/10 ring-1 ring-brand/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300/80 dark:hover:border-slate-600 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Absolute drop indicator to prevent layout shift */}
                    {isDraggedOver && draggedIndex !== null && (
                      <div className={`absolute left-0 right-0 h-1 bg-brand z-20 shadow-[0_0_8px_rgba(59,130,246,0.6)] ${
                        draggedIndex > idx ? 'top-0' : 'bottom-0'
                      }`} />
                    )}
                    <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl transition-colors ${
                      isExpanded ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-brand/60'
                    }`} />
                    
                    {/* Header Row (Always Visible) */}
                    <div 
                      onClick={() => toggleExpand(f.id)}
                      onMouseEnter={() => setDraggableIndex(idx)}
                      onMouseLeave={() => setDraggableIndex(null)}
                      className="drag-header flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-700/20 transition-all select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Drag handle */}
                        <div className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors shrink-0">
                          <GripVertical size={14} className="stroke-[2.5]" />
                        </div>

                        {/* Expand Chevron */}
                        <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0">
                          {isExpanded ? <ChevronDown size={14} className="stroke-[2.5]" /> : <ChevronRight size={14} className="stroke-[2.5]" />}
                        </div>
                        
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-1">
                            {f.label || <span className="text-slate-400 dark:text-slate-500 italic">Untitled Filter</span>}
                          </h3>
                          {!isExpanded && (
                            <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                              <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                                {f.column || 'no-col'}
                              </span>
                              <span>•</span>
                              <span className="text-brand">
                                {f.type === 'select' ? 'dropdown' : f.type === 'date_range' ? 'date' : 'text'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Trash Delete button */}
                        <button 
                          type="button"
                          onClick={() => handleRemoveFilter(idx)}
                          className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Remove Filter"
                        >
                          <Trash2 size={13} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Body Form Content (Conditionally Visible) */}
                  {isExpanded && (
                    <div className="p-5 pt-1 border-t border-slate-100/60 dark:border-slate-700/60 bg-slate-50/30 dark:bg-slate-900/30 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex gap-3.5">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Label</label>
                          <div className="relative">
                            <Type size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 stroke-[2]" />
                            <input 
                              value={f.label} 
                              onChange={e => updateFilter(idx, { label: e.target.value })}
                              placeholder="e.g. Regions"
                              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-medium text-slate-900 dark:text-slate-100" 
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Global Col</label>
                          <div className="relative">
                            <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 stroke-[2]" />
                            <input 
                              value={f.column} 
                              onChange={e => updateFilter(idx, { column: e.target.value })}
                              placeholder="region_id"
                              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-mono text-slate-900 dark:text-slate-100" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3.5">
                        <div className="flex-1 min-w-0 space-y-1.5">
                           <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Input Type</label>
                           <CustomSelect
                             value={f.type}
                             onChange={val => updateFilter(idx, { type: val as any, source: 'static' })}
                             options={[
                               { value: 'text', label: 'Free Text', icon: <Type size={14} className="text-slate-400 dark:text-slate-500" /> },
                               { value: 'select', label: 'Dropdown / Multi', icon: <Settings2 size={14} className="text-slate-400 dark:text-slate-500" /> },
                               { value: 'date_range', label: 'Date Picker', icon: <Calendar size={14} className="text-slate-400 dark:text-slate-500" /> },
                             ]}
                             leftIcon={
                               f.type === 'text' ? <Type size={14} className="text-brand stroke-[2.5]" /> : 
                               f.type === 'date_range' ? <Calendar size={14} className="text-brand stroke-[2.5]" /> : 
                               <Settings2 size={14} className="text-brand stroke-[2.5]" />
                             }
                           />
                        </div>
                        {f.type === 'select' && (
                          <div className="flex-1 min-w-0 space-y-1.5">
                             <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Source</label>
                             <CustomSelect
                               value={f.source || 'static'}
                               onChange={val => updateFilter(idx, { source: val as any })}
                               options={[
                                 { value: 'static', label: 'Static List' },
                                 { value: 'dynamic', label: 'Database-Backed' },
                               ]}
                             />
                          </div>
                        )}
                      </div>

                      {f.type === 'select' && f.source === 'static' && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                           <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Options (Comma Separated)</label>
                           <textarea 
                             value={(f.options || []).join(', ')} 
                             onChange={e => updateFilter(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                             placeholder="High, Medium, Low..."
                             rows={2}
                             className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all resize-none font-medium text-slate-900 dark:text-slate-100"
                           />
                        </div>
                      )}

                      {f.type === 'select' && f.source === 'dynamic' && (
                        <div className="p-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-4 animate-in slide-in-from-top-1 duration-150 shadow-inner">
                           <div className="space-y-1.5">
                             <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Live Source Dataset</label>
                             <CustomSelect
                               value={f.dataset_id || ''}
                               onChange={val => updateFilter(idx, { dataset_id: val ? Number(val) : undefined })}
                               placeholder="Choose Dataset..."
                               options={[
                                 { value: '', label: 'Choose Dataset...' },
                                 ...(availableDatasets || []).map(ds => ({
                                   value: ds.id,
                                   label: ds.name,
                                   icon: <Database size={12} className="text-slate-400 dark:text-slate-500" />
                                 }))
                               ]}
                             />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Value Column</label>
                             <input 
                               value={f.value_column || ''} 
                               onChange={e => updateFilter(idx, { value_column: e.target.value })}
                               placeholder="Column name for distinct values"
                               className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand font-medium text-slate-900 dark:text-slate-100 transition-all"
                             />
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
              );
            })
          )}

          <button 
            type="button" 
            onClick={handleAddFilter}
            className="w-full py-4 border-2 border-dashed border-brand/30 rounded-2xl text-xs font-black text-brand hover:text-white hover:border-brand hover:bg-brand transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer shadow-sm hover:shadow-brand/20"
          >
            <div className="p-2 bg-brand/10 rounded-xl group-hover:bg-white/20 transition-colors">
              <Plus size={18} className="stroke-[2.5]" />
            </div>
            <span>Deploy New Filter Control</span>
          </button>
        </div>
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            {localFilters.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center shadow-sm">
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Configure filters first before setting their advanced defaults and restrictions.
                </p>
              </div>
            ) : (
              localFilters.map((f, idx) => {
                const isExpanded = !!expandedFilterIds[f.id];
                return (
                <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200">
                  <div 
                    onClick={() => toggleExpand(f.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-700/20 select-none border-b border-transparent data-[expanded=true]:border-slate-100 dark:data-[expanded=true]:border-slate-700 pb-3"
                    data-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="text-slate-400 dark:text-slate-500 transition-colors shrink-0">
                        {isExpanded ? <ChevronDown size={14} className="stroke-[2.5]" /> : <ChevronRight size={14} className="stroke-[2.5]" />}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {f.label || 'Untitled Filter'}
                        </h3>
                        {!isExpanded && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">
                            {f.column || 'no-col'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                      {f.type === 'select' && f.source === 'dynamic' && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${f.enable_drill_down ? 'bg-brand border-brand' : 'bg-white border-slate-300 group-hover:border-brand/50'}`}>
                            {f.enable_drill_down && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={f.enable_drill_down || false}
                            onChange={e => updateFilter(idx, { enable_drill_down: e.target.checked })}
                          />
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Drill Down</span>
                        </label>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${f.is_required ? 'bg-red-500 border-red-500' : 'bg-white border-slate-300 group-hover:border-red-400'}`}>
                          {f.is_required && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={f.is_required || false}
                          onChange={e => updateFilter(idx, { is_required: e.target.checked })}
                        />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Required</span>
                      </label>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 pt-2 border-t border-slate-100/60 dark:border-slate-700/60 bg-slate-50/30 dark:bg-slate-900/30 animate-in fade-in slide-in-from-top-1 duration-150 rounded-b-2xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fallback Default Value</label>
                        <CustomSelect
                          value=""
                          onChange={(val) => {
                            if (val) {
                              const currentVal = f.default_value || '';
                              const newVal = currentVal ? `${currentVal}, {{${val}}}` : `{{${val}}}`;
                              updateFilter(idx, { default_value: newVal });
                            }
                          }}
                          placeholder="Insert Variable..."
                          options={[
                            { value: '', label: 'Insert Variable...' },
                            { value: 'CURRENT_DATE', label: 'Today (YYYY-MM-DD)' },
                            { value: 'CURRENT_MONTH', label: 'Start of Current Month' },
                            { value: 'PREVIOUS_MONTH', label: 'Start of Previous Month' },
                            { value: 'CURRENT_YEAR', label: 'Start of Current Year' }
                          ]}
                          leftIcon={<Database size={10} className="text-brand" />}
                        />
                      </div>
                      <input
                        value={f.default_value || ''}
                        onChange={e => updateFilter(idx, { default_value: e.target.value })}
                        placeholder={`e.g. NA, EMEA or {{CURRENT_DATE}}`}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl outline-none hover:border-slate-300 dark:hover:border-slate-600 focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
                      />
                      <p className="text-[9px] text-slate-400 mt-1.5 px-1 leading-relaxed">
                        Supports comma-separated values (for multi-select/date ranges) and dynamic variables.
                      </p>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
        <button
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white rounded-xl text-sm font-extrabold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all transform active:scale-95 group"
        >
          <Save size={18} className="group-hover:scale-110 transition-transform" /> Sync Filter Definitions
        </button>
      </div>
    </div>
  );
};

export default DashboardFiltersPanel;
