import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Plus, Edit2, Trash2, Globe, X, Search, Check, ChevronDown, Shield, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

// Custom MultiSelect component for objects
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
        className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm cursor-pointer hover:border-brand/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value.length === 0 ? "text-slate-400 font-medium" : "font-bold text-slate-700 dark:text-slate-300"}>
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium text-slate-700 dark:text-slate-200"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs text-center text-slate-400 font-medium">No options found.</div>
            ) : (
              filteredOptions.map((opt: any) => {
                const isSelected = value.includes(keyExtractor(opt));
                return (
                  <div 
                    key={keyExtractor(opt)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors font-medium ${isSelected ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
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

interface LOB {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  role_ids: number[];
  group_ids: number[];
  user_ids: string[];
}

interface LOBFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  role_ids: number[];
  group_ids: number[];
  user_ids: string[];
}

const LOBManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLob, setEditingLob] = useState<LOB | null>(null);
  const [deletingLobId, setDeletingLobId] = useState<number | null>(null);

  const { data: lobs, isLoading } = useQuery<LOB[]>({
    queryKey: ['lobs'],
    queryFn: async () => {
      const response = await api.get('/api/lob/');
      return response.data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/api/roles/')).data
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/api/groups/')).data
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/api/users/')).data
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<LOBFormData>();

  const watchRoleIds = watch('role_ids', []);
  const watchGroupIds = watch('group_ids', []);
  const watchUserIds = watch('user_ids', []);

  const createMutation = useMutation({
    mutationFn: (newLob: LOBFormData) => api.post('/api/lob/', newLob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lobs'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; lob: LOBFormData }) => api.patch(`/api/lob/${data.id}`, data.lob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lobs'] });
      setIsModalOpen(false);
      setEditingLob(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/lob/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lobs'] });
      toast.success('LOB deleted successfully');
      setDeletingLobId(null);
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail || 'Cannot delete LOB because it is referenced by other resources.');
      } else {
        toast.error('Failed to delete LOB');
      }
      setDeletingLobId(null);
    }
  });

  const onSubmit = (data: LOBFormData) => {
    if (editingLob) {
      updateMutation.mutate({ id: editingLob.id, lob: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (lob: LOB) => {
    setEditingLob(lob);
    setValue('name', lob.name);
    setValue('description', lob.description || '');
    setValue('icon', lob.icon || '');
    setValue('color', lob.color || '#3b82f6');
    setValue('is_active', lob.is_active);
    setValue('role_ids', lob.role_ids || []);
    setValue('group_ids', lob.group_ids || []);
    setValue('user_ids', lob.user_ids || []);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingLob(null);
    reset({
      name: '',
      description: '',
      icon: 'Globe',
      color: '#3b82f6',
      is_active: true,
      role_ids: [],
      group_ids: [],
      user_ids: [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingLobId(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Globe size={24} className="text-brand" /> Line of Business
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage platform LOBs and data scoping</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add LOB
        </button>
      </div>

      <div className="card overflow-hidden p-0 dark:bg-slate-900 dark:border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">LOB Name</th>
              <th className="px-6 py-4 font-medium">Access Control</th>
              <th className="px-6 py-4 font-medium text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">Loading LOBs...</td>
              </tr>
            ) : lobs?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">No LOBs found</td>
              </tr>
            ) : (
              lobs?.map((lob) => (
                <tr key={lob.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5"
                        style={{ backgroundColor: lob.color || '#3b82f6' }}
                      >
                        <Globe size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{lob.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[200px]">{lob.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {lob.role_ids?.length > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Shield size={12}/> {lob.role_ids.length} Roles</span>}
                      {lob.group_ids?.length > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={12}/> {lob.group_ids.length} Groups</span>}
                      {lob.user_ids?.length > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={12}/> {lob.user_ids.length} Users</span>}
                      {(!lob.role_ids?.length && !lob.group_ids?.length && !lob.user_ids?.length) && <span className="text-xs text-slate-400 italic">Admin only</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      lob.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {lob.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-slate-400">
                      <button 
                        onClick={() => openEditModal(lob)}
                        className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(lob.id)}
                        className="p-1.5 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingLob ? 'Edit LOB' : 'Add New LOB'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">General Details</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">LOB Name</label>
                    <input
                      {...register('name', { required: 'Name is required' })}
                      className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 ${
                        errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                      }`}
                      placeholder="e.g. Sales, Marketing"
                    />
                    {errors.name && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                    <textarea
                      {...register('description')}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-sm font-medium dark:text-slate-100 h-24 resize-none"
                      placeholder="What is this LOB for?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Accent Color</label>
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <input
                          type="color"
                          {...register('color')}
                          className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">HEX Value</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-6 ml-auto">
                      <input
                        type="checkbox"
                        id="is_active"
                        {...register('is_active')}
                        className="w-4 h-4 text-brand border-slate-300 dark:border-slate-700 rounded focus:ring-brand dark:bg-slate-900"
                      />
                      <label htmlFor="is_active" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer">Active</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Access Control</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1.5"><Shield size={14}/> Allowed Roles</label>
                    <MultiSelect
                      options={roles}
                      value={watchRoleIds}
                      onChange={(ids: number[]) => setValue('role_ids', ids)}
                      placeholder="Select roles..."
                      keyExtractor={(r: any) => r.id}
                      labelExtractor={(r: any) => r.name}
                      renderOption={(r: any) => <span className="font-semibold">{r.name}</span>}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1.5"><Users size={14}/> Allowed Groups</label>
                    <MultiSelect
                      options={groups}
                      value={watchGroupIds}
                      onChange={(ids: number[]) => setValue('group_ids', ids)}
                      placeholder="Select groups..."
                      keyExtractor={(g: any) => g.id}
                      labelExtractor={(g: any) => g.name}
                      renderOption={(g: any) => <span className="font-semibold">{g.name}</span>}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1.5"><Users size={14}/> Allowed Users</label>
                    <MultiSelect
                      options={users}
                      value={watchUserIds}
                      onChange={(ids: string[]) => setValue('user_ids', ids)}
                      placeholder="Select specific users..."
                      keyExtractor={(u: any) => u.id}
                      labelExtractor={(u: any) => u.email}
                      renderOption={(u: any) => (
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold">{u.full_name || u.email}</span>
                          {u.full_name && <span className="text-[10px] text-slate-400">{u.email}</span>}
                        </div>
                      )}
                    />
                  </div>

                  {(!watchRoleIds.length && !watchGroupIds.length && !watchUserIds.length) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <Shield size={14} className="mt-0.5 shrink-0" />
                      <p>If no roles, groups, or users are selected, this LOB will only be visible to Administrators.</p>
                    </div>
                  )}

                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2.5 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand/90 transition-all disabled:opacity-50 shadow-lg shadow-brand/20"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingLob ? 'Update LOB' : 'Create LOB')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deletingLobId !== null}
        onClose={() => setDeletingLobId(null)}
        onConfirm={() => deletingLobId && deleteMutation.mutate(deletingLobId)}
        title="Delete Line of Business"
        message="Are you sure you want to delete this Line of Business? This will remove all scoping for users associated with this LOB."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default LOBManagementPage;
