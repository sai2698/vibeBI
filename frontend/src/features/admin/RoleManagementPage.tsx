import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Plus, Edit2, Trash2, Shield, X, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Permission {
  id: number;
  name: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  permissions: Permission[];
}

interface RoleFormData {
  name: string;
  description: string;
  permission_ids: number[];
}

const RoleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/api/roles/');
      return response.data;
    },
  });

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/api/roles/permissions');
      return response.data;
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RoleFormData>({
    defaultValues: {
      permission_ids: []
    }
  });

  const selectedPermissionIds = watch('permission_ids') || [];

  const createMutation = useMutation({
    mutationFn: (newRole: RoleFormData) => api.post('/api/roles/', newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; role: RoleFormData }) => api.patch(`/api/roles/${data.id}`, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      setEditingRole(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const onSubmit = (data: RoleFormData) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, role: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setValue('name', role.name);
    setValue('description', role.description || '');
    setValue('permission_ids', role.permissions?.map(p => p.id) || []);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingRole(null);
    reset({
      name: '',
      description: '',
      permission_ids: []
    });
    setIsModalOpen(true);
  };

  const togglePermission = (permId: number) => {
    const current = [...selectedPermissionIds];
    const index = current.indexOf(permId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(permId);
    }
    setValue('permission_ids', current);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield size={24} className="text-brand" /> Roles
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage RBAC roles and permissions</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create Role
        </button>
      </div>

      <div className="card overflow-hidden p-0 dark:bg-slate-900 dark:border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Role Name</th>
              <th className="px-6 py-4 font-medium">Permissions</th>
              <th className="px-6 py-4 font-medium">Created At</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">Loading roles...</td>
              </tr>
            ) : roles?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">No roles found</td>
              </tr>
            ) : (
              roles?.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{role.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">{role.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.map(p => (
                        <span key={p.id} title={p.description} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 text-[10px] font-bold uppercase tracking-wider">
                          <Key size={10} /> {p.name}
                        </span>
                      )) || <span className="text-slate-400 dark:text-slate-500 italic text-xs">No permissions</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                    {new Date(role.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 text-slate-400">
                      <button 
                        onClick={() => openEditModal(role)}
                        className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(role.id)}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Role Name</label>
                <input
                  {...register('name', { required: 'Role name is required' })}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 ${
                    errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                  }`}
                  placeholder="e.g. Viewer, Editor, Manager"
                />
                {errors.name && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-sm font-medium dark:text-slate-100 h-24 resize-none"
                  placeholder="What can this role do?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">Assign Permissions</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {permissions?.map(perm => (
                    <button
                      key={perm.id}
                      type="button"
                      onClick={() => togglePermission(perm.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        selectedPermissionIds.includes(perm.id)
                          ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-700 ring-1 ring-amber-400/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedPermissionIds.includes(perm.id) ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                          <Key size={16} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">{perm.name}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{perm.description}</div>
                        </div>
                      </div>
                      {selectedPermissionIds.includes(perm.id) && <Plus size={14} className="rotate-45" />}
                    </button>
                  ))}
                </div>
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
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementPage;
