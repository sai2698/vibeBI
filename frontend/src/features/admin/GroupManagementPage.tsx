import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Plus, Edit2, Trash2, Users, X, Shield, ChevronDown, Search, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  roles: Role[];
}

interface GroupFormData {
  name: string;
  description: string;
  role_ids: number[];
}

const GroupManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/api/groups/');
      return response.data;
    },
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/api/roles/');
      return response.data;
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<GroupFormData>({
    defaultValues: {
      role_ids: []
    }
  });

  const selectedRoleIds = watch('role_ids') || [];

  const createMutation = useMutation({
    mutationFn: (newGroup: GroupFormData) => api.post('/api/groups/', newGroup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; group: GroupFormData }) => api.patch(`/api/groups/${data.id}`, data.group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsModalOpen(false);
      setEditingGroup(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const onSubmit = (data: GroupFormData) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, group: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setValue('name', group.name);
    setValue('description', group.description || '');
    setValue('role_ids', group.roles?.map(r => r.id) || []);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    reset({
      name: '',
      description: '',
      role_ids: []
    });
    setIsModalOpen(true);
  };

  const toggleRole = (roleId: number) => {
    const current = [...selectedRoleIds];
    const index = current.indexOf(roleId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(roleId);
    }
    setValue('role_ids', current);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users size={24} className="text-brand" /> Groups
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage user groups and collective permissions</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create Group
        </button>
      </div>

      <div className="card overflow-hidden p-0 dark:bg-slate-900 dark:border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Group Name</th>
              <th className="px-6 py-4 font-medium">Roles</th>
              <th className="px-6 py-4 font-medium">Created At</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">Loading groups...</td>
              </tr>
            ) : groups?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">No groups found</td>
              </tr>
            ) : (
              groups?.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{group.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">{group.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {group.roles?.map(r => (
                        <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light text-[10px] font-bold uppercase tracking-wider">
                          <Shield size={10} /> {r.name}
                        </span>
                      )) || <span className="text-slate-400 dark:text-slate-500 italic text-xs">No roles</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                    {new Date(group.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 text-slate-400">
                      <button 
                        onClick={() => openEditModal(group)}
                        className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(group.id)}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-visible animate-in zoom-in duration-200 border dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingGroup ? 'Edit Group' : 'Create New Group'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Group Name</label>
                <input
                  {...register('name', { required: 'Group name is required' })}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 ${
                    errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                  }`}
                  placeholder="e.g. Sales Team, Engineering"
                />
                {errors.name && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-sm font-medium dark:text-slate-100 h-24 resize-none"
                  placeholder="Who is in this group?"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Assign Roles</label>
                
                {/* Multiselect Trigger */}
                <div 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 flex items-center justify-between cursor-pointer"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className={selectedRoleIds.length === 0 ? "text-slate-400" : "text-slate-900 dark:text-white"}>
                    {selectedRoleIds.length === 0 
                      ? "Select roles..." 
                      : `${selectedRoleIds.length} role${selectedRoleIds.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Multiselect Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-brand text-slate-900 dark:text-white"
                          placeholder="Search roles..."
                          value={roleSearch}
                          onChange={(e) => setRoleSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                      {roles
                        ?.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.description.toLowerCase().includes(roleSearch.toLowerCase()))
                        .map(role => (
                        <div
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            selectedRoleIds.includes(role.id) 
                              ? 'bg-brand/10 text-brand dark:bg-brand/20' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                            selectedRoleIds.includes(role.id) 
                              ? 'bg-brand border-brand text-white' 
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selectedRoleIds.includes(role.id) && <Check size={12} />}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{role.name}</div>
                            <div className="text-[10px] opacity-70">{role.description}</div>
                          </div>
                        </div>
                      ))}
                      {roles?.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.description.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-500">No roles found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand/90 transition-all disabled:opacity-50 shadow-lg shadow-brand/20"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingGroup ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagementPage;
