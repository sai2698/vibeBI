import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api';
import { X, Table, Code, AlertCircle, Search, Loader2, ChevronDown } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { useLOBStore } from '../../store/useLOBStore';

interface Datasource {
  id: number;
  name: string;
  engine: string;
}

interface DatasetFormData {
  name: string;
  datasource_id: number;
  schema_name?: string;
  table_name?: string;
  custom_sql?: string;
  schema_metadata?: any;
  lob_id?: number;
}

interface DatasetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editDataset?: any;
}

const SearchableDropdown: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[] | undefined;
  isLoading: boolean;
  placeholder: string;
  icon: React.ReactNode;
  disabled?: boolean;
}> = ({ label, value, onChange, options, isLoading, placeholder, icon, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options?.filter(o => 
    o?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 border rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-sm
          ${isOpen ? 'border-brand ring-4 ring-brand/5 bg-white' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`${value ? 'text-brand' : 'text-slate-400'} shrink-0`}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : icon}
          </div>
          <span className={`text-sm truncate font-medium ${value ? 'text-slate-900' : 'text-slate-400'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/30">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                autoFocus
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all font-medium"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-slate-400 space-y-2">
                <Loader2 size={24} className="animate-spin text-brand mx-auto" />
                <p className="text-xs font-bold uppercase tracking-widest">Fetching data...</p>
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors
                    ${value === opt ? 'bg-brand/5 text-brand font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}
                  `}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(var(--color-brand),0.5)]" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-slate-400 space-y-2">
                <Search size={24} className="mx-auto opacity-20" />
                <p className="text-xs font-bold">No results found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DatasetFormModal: React.FC<DatasetFormModalProps> = ({ isOpen, onClose, onSuccess, editDataset }) => {
  const queryClient = useQueryClient();
  const activeLOB = useLOBStore((state: any) => state.activeLOB);
  const [mode, setMode] = useState<'table' | 'sql'>('table');
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<DatasetFormData>();

  const datasource_id = watch('datasource_id');
  const schema_name = watch('schema_name');

  useEffect(() => {
    if (editDataset) {
      reset({
        name: editDataset.name,
        datasource_id: editDataset.datasource_id,
        schema_name: editDataset.schema_name || '',
        table_name: editDataset.table_name || '',
        custom_sql: editDataset.custom_sql || '',
        schema_metadata: editDataset.schema_metadata
      });
      setMode(editDataset.custom_sql ? 'sql' : 'table');
    } else {
      reset({ name: '', datasource_id: 0, schema_name: '', table_name: '', custom_sql: '' });
      setMode('table');
    }
  }, [editDataset, reset, isOpen]);



  const { data: datasources } = useQuery<Datasource[]>({
    queryKey: ['datasources'],
    queryFn: async () => (await api.get('/api/datasources/')).data,
    enabled: isOpen,
  });

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery<string[]>({
    queryKey: ['schemas', datasource_id],
    queryFn: async () => (await api.get(`/api/sqllab/schemas?datasource_id=${datasource_id}`)).data,
    enabled: !!datasource_id && mode === 'table',
  });

  const { data: tables, isLoading: isLoadingTables } = useQuery<any[]>({
    queryKey: ['tables', datasource_id, schema_name],
    queryFn: async () => {
      let url = `/api/sqllab/tables?datasource_id=${datasource_id}`;
      if (schema_name) url += `&schema=${schema_name}`;
      const res = (await api.get(url)).data;
      if (res && typeof res === 'object' && Array.isArray(res.tables)) {
        return res.tables;
      }
      if (Array.isArray(res)) {
        return res;
      }
      return [];
    },
    enabled: !!datasource_id && mode === 'table',
  });

  useEffect(() => {
    if (!editDataset) {
        setValue('schema_name', '');
        setValue('table_name', '');
    }
  }, [datasource_id, setValue, editDataset]);

  useEffect(() => {
    if (!editDataset) {
        setValue('table_name', '');
    }
  }, [schema_name, setValue, editDataset]);

  const createMutation = useMutation({
    mutationFn: (newDataset: DatasetFormData) => api.post('/api/datasets/', newDataset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset created successfully!');
      onSuccess();
    },
    onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Failed to create dataset');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: DatasetFormData) => api.patch(`/api/datasets/${editDataset.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset updated successfully!');
      onSuccess();
    },
    onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Failed to update dataset');
    }
  });

  const onSubmit = (data: DatasetFormData) => {
    if (mode === 'table') {
      data.custom_sql = '';
    } else {
      data.table_name = '';
    }
    
    if (activeLOB) {
      data.lob_id = activeLOB.id;
    }
    
    if (editDataset) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">
            {editDataset ? 'Edit Dataset' : 'Create New Dataset'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dataset Name</label>
              <input
                {...register('name', { required: 'Dataset name is required' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                placeholder="e.g. Sales Analysis, Customer Metrics"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Datasource</label>
              <select
                {...register('datasource_id', { required: 'Datasource is required' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
              >
                <option value="">Select a datasource...</option>
                {datasources?.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name} ({ds.engine})</option>
                ))}
              </select>
              {errors.datasource_id && <p className="mt-1 text-xs text-red-500">{errors.datasource_id.message}</p>}
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Source Type</label>
              <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('table')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                    mode === 'table' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Table size={16} /> Table
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sql')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                    mode === 'sql' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Code size={16} /> Custom SQL
                </button>
              </div>
            </div>

            {mode === 'table' ? (
              <div className="grid grid-cols-2 gap-5">
                <Controller
                  name="schema_name"
                  control={control}
                  render={({ field }) => (
                    <SearchableDropdown
                      label="Schema"
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={schemas}
                      isLoading={isLoadingSchemas}
                      placeholder="Select a schema"
                      icon={<Search size={16} />}
                      disabled={!datasource_id}
                    />
                  )}
                />
                <Controller
                  name="table_name"
                  control={control}
                  rules={{ required: mode === 'table' ? 'Table name is required' : false }}
                  render={({ field }) => (
                    <div>
                      <SearchableDropdown
                        label="Table"
                        value={field.value || ''}
                        onChange={field.onChange}
                        options={tables?.map(t => typeof t === 'string' ? t : t.name)}
                        isLoading={isLoadingTables}
                        placeholder="Select a table"
                        icon={<Table size={16} />}
                        disabled={!datasource_id}
                      />
                      {errors.table_name && <p className="mt-1.5 text-[11px] font-bold text-red-500 uppercase tracking-wider">{errors.table_name.message}</p>}
                    </div>
                  )}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SQL Query</label>
                <textarea
                  {...register('custom_sql', { required: mode === 'sql' ? 'SQL query is required' : false })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono text-xs"
                  placeholder="SELECT * FROM table JOIN other..."
                />
              </div>
            )}
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-2 text-red-600 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{(createMutation.error as any)?.response?.data?.detail || (updateMutation.error as any)?.response?.data?.detail || "Failed to save dataset"}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editDataset ? 'Saving...' : 'Creating...'}
                </>
              ) : (editDataset ? 'Save Changes' : 'Create Dataset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DatasetFormModal;
