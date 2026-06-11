import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { Database, Plus, Trash2, Edit3, Save, X, Shield, Layers, ChevronDown, Check, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLOBStore } from '../../../store/useLOBStore';

// Custom MultiSelect component
const MultiSelect = ({ options, value, onChange, placeholder, renderOption, keyExtractor, labelExtractor }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o: any) => 
    labelExtractor(o).toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt: any) => {
    const key = keyExtractor(opt);
    if (value.includes(key)) {
      onChange(value.filter((v: any) => v !== key));
    } else {
      onChange([...value, key]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <div 
        className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value.length === 0 ? "text-slate-400" : "font-semibold text-slate-700 dark:text-slate-300"}>
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs text-center text-slate-400">No options found.</div>
            ) : (
              filteredOptions.map((opt: any) => {
                const isSelected = value.includes(keyExtractor(opt));
                return (
                  <div 
                    key={keyExtractor(opt)}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-pointer transition-colors ${isSelected ? 'bg-brand/10 text-brand' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    onClick={() => toggleOption(opt)}
                  >
                    <div className={`w-4 h-4 flex items-center justify-center rounded border flex-shrink-0 transition-colors ${isSelected ? 'bg-brand border-brand text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'}`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="truncate flex-1">
                      {renderOption ? renderOption(opt) : labelExtractor(opt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DataMartsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const activeLOB = useLOBStore((state: any) => state.activeLOB);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});
  
  // Datasource filter state
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | 'all'>('all');
  
  // Search state for datamarts
  const [searchQuery, setSearchQuery] = useState('');

  const { data: datamarts = [], isLoading } = useQuery({
    queryKey: ['datamarts-admin', activeLOB?.id],
    queryFn: async () => (await api.get('/api/datamarts/', { params: { lob_id: activeLOB?.id } })).data
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/api/roles/')).data
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => (await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } })).data
  });
  
  const { data: datasources = [] } = useQuery({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get('/api/datasources/')).data
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/api/datamarts/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datamarts-admin'] });
      setEditingId(null);
      toast.success('Data Mart created');
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => api.patch(`/api/datamarts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datamarts-admin'] });
      setEditingId(null);
      toast.success('Data Mart updated');
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/datamarts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datamarts-admin'] });
      toast.success('Data Mart deleted');
    }
  });

  const handleSave = () => {
    if (editingId === -1) {
      createMut.mutate(formData);
    } else {
      updateMut.mutate({ id: editingId!, data: formData });
    }
  };

  const openEditor = (dm?: any) => {
    if (dm) {
      setEditingId(dm.id);
      setFormData({
        name: dm.name,
        description: dm.description || '',
        role_ids: dm.role_ids || [],
        dataset_ids: dm.datasets?.map((d: any) => d.id) || []
      });
      setSelectedDatasourceId('all'); // Reset filter when opening editor
    } else {
      setEditingId(-1);
      setFormData({ name: 'New Data Mart', description: '', role_ids: [], dataset_ids: [], lob_id: activeLOB?.id });
      setSelectedDatasourceId('all');
    }
  };
  
  const filteredDatasets = datasets.filter((d: any) => selectedDatasourceId === 'all' || d.datasource_id === selectedDatasourceId);
  
  const filteredDatamarts = datamarts.filter((dm: any) => 
    dm.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (dm.description && dm.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center w-full h-full text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading Data Marts...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-900/50">
      {/* List */}
      <div className="w-[320px] lg:w-[380px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10 shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Data Marts</h2>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Semantic Layer</p>
          </div>
          <button 
            onClick={() => openEditor()} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition-all shadow-sm shadow-brand/20 active:scale-95"
          >
            <Plus size={14} /> New
          </button>
        </div>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search data marts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-shadow"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
          {filteredDatamarts.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                <Database size={24} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {datamarts.length === 0 ? "No data marts found" : "No results found"}
              </p>
              <p className="text-xs text-slate-500">
                {datamarts.length === 0 ? "Create one to start organizing your datasets." : "Try adjusting your search query."}
              </p>
            </div>
          )}
          {filteredDatamarts.map((dm: any) => (
            <div 
              key={dm.id} 
              className={`p-4 bg-white dark:bg-slate-800 border rounded-xl transition-all cursor-pointer group ${editingId === dm.id ? 'border-brand ring-1 ring-brand/20 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'}`}
              onClick={() => { if (editingId !== dm.id) openEditor(dm); }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database size={16} className={editingId === dm.id ? 'text-brand' : 'text-slate-400 group-hover:text-brand transition-colors'} /> 
                  <span className="truncate">{dm.name}</span>
                </h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteMut.mutate(dm.id); }} 
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                    title="Delete Data Mart"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{dm.description || <span className="italic opacity-50">No description</span>}</p>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                  <Layers size={12} className="text-blue-500"/> {dm.datasets?.length || 0} Datasets
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                  <Shield size={12} className="text-emerald-500"/> {dm.role_ids?.length || 0} Roles
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto relative">
        {editingId !== null ? (
          <div className="max-w-3xl mx-auto w-full p-8 lg:p-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingId === -1 ? 'Create Data Mart' : 'Edit Data Mart'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Configure data mart details, included datasets, and access roles.</p>
              </div>
              <button 
                onClick={() => setEditingId(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20}/>
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {/* General Info */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="w-6 h-6 rounded-md bg-brand/10 text-brand flex items-center justify-center"><Edit3 size={14} /></div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">General Information</h3>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Sales & Marketing Hub"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the purpose of this data mart..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Data Sources & Datasets */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center"><Layers size={14} /></div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Data Assets</h3>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="sm:w-1/3 shrink-0">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Filter size={12} /> Filter by Datasource
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDatasourceId}
                        onChange={(e) => setSelectedDatasourceId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="w-full appearance-none px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand/50 font-medium cursor-pointer"
                      >
                        <option value="all">All Datasources</option>
                        {datasources.map((ds: any) => (
                          <option key={ds.id} value={ds.id}>{ds.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Filtering limits the datasets shown in the dropdown.</p>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Select Datasets
                    </label>
                    <MultiSelect
                      options={filteredDatasets}
                      value={formData.dataset_ids}
                      onChange={(ids: number[]) => setFormData({...formData, dataset_ids: ids})}
                      placeholder="Select datasets to include..."
                      keyExtractor={(d: any) => d.id}
                      labelExtractor={(d: any) => d.name}
                      renderOption={(d: any) => (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{d.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{d.table_name || 'Custom SQL'}</span>
                        </div>
                      )}
                    />
                    
                    {formData.dataset_ids.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.dataset_ids.map((id: number) => {
                          const dataset = datasets.find((d: any) => d.id === id);
                          if (!dataset) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-md border border-blue-200 dark:border-blue-900/30">
                              <Layers size={10} /> {dataset.name}
                              <button 
                                onClick={() => setFormData({...formData, dataset_ids: formData.dataset_ids.filter((i: number) => i !== id)})}
                                className="ml-1 text-blue-400 hover:text-blue-700 dark:hover:text-blue-200"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Roles / Access Control */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Shield size={14} /></div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Access Control</h3>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Allowed Roles
                  </label>
                  <MultiSelect
                    options={roles}
                    value={formData.role_ids}
                    onChange={(ids: number[]) => setFormData({...formData, role_ids: ids})}
                    placeholder="Select roles with access..."
                    keyExtractor={(r: any) => r.id}
                    labelExtractor={(r: any) => r.name}
                    renderOption={(r: any) => (
                      <span className="font-semibold">{r.name}</span>
                    )}
                  />
                  
                  {formData.role_ids.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formData.role_ids.map((id: number) => {
                        const role = roles.find((r: any) => r.id === id);
                        if (!role) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-md border border-emerald-200 dark:border-emerald-900/30">
                            <Shield size={10} /> {role.name}
                            <button 
                              onClick={() => setFormData({...formData, role_ids: formData.role_ids.filter((i: number) => i !== id)})}
                              className="ml-1 text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {formData.role_ids.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                      <Shield size={12} /> No roles selected. Only administrators will have access.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setEditingId(null)} 
                className="px-5 py-2.5 font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={createMut.isPending || updateMut.isPending || !formData.name?.trim()} 
                className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all shadow-md shadow-brand/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-sm"
              >
                <Save size={16}/> {editingId === -1 ? 'Create Data Mart' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-8 text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Database size={40} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Data Mart Management</h3>
            <p className="text-sm max-w-md mx-auto mb-8">
              Select a data mart from the left sidebar to edit its properties, manage included datasets, and configure role-based access control.
            </p>
            <button 
              onClick={() => openEditor()} 
              className="flex items-center gap-2 px-6 py-3 bg-brand/10 text-brand font-bold rounded-xl hover:bg-brand/20 transition-colors"
            >
              <Plus size={18} /> Create New Data Mart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMartsManager;

