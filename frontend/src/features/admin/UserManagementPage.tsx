import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Plus, Edit2, Trash2, User, X, Shield, Users as GroupsIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Group {
  id: number;
  name: string;
  description: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  groups: Group[];
}

interface UserFormData {
  email: string;
  full_name: string;
  password?: string;
  is_active: boolean;
  group_ids: number[];
}

const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/api/users/');
      return response.data;
    },
  });

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/api/groups/');
      return response.data;
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserFormData>({
    defaultValues: {
      group_ids: []
    }
  });

  const selectedGroupIds = watch('group_ids') || [];

  const createMutation = useMutation({
    mutationFn: (newUser: UserFormData) => api.post('/api/users/', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; user: UserFormData }) => api.patch(`/api/users/${data.id}`, data.user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, user: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setValue('email', user.email);
    setValue('full_name', user.full_name || '');
    setValue('is_active', user.is_active);
    setValue('password', '');
    setValue('group_ids', user.groups.map(g => g.id));
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    reset({
      email: '',
      full_name: '',
      password: '',
      is_active: true,
      group_ids: []
    });
    setIsModalOpen(true);
  };

  const toggleGroup = (groupId: number) => {
    const current = [...selectedGroupIds];
    const index = current.indexOf(groupId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(groupId);
    }
    setValue('group_ids', current);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User size={24} className="text-brand" /> Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage platform access and user accounts</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      <div className="card overflow-hidden p-0 dark:bg-slate-900 dark:border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Name / Email</th>
              <th className="px-6 py-4 font-medium">Groups</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">Loading users...</td>
              </tr>
            ) : users?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">No users found</td>
              </tr>
            ) : (
              users?.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{user.full_name || 'No Name'}</div>
                    <div className="text-slate-500 dark:text-slate-400">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.groups?.map(g => (
                        <span key={g.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                          <GroupsIcon size={10} /> {g.name}
                        </span>
                      )) || <span className="text-slate-400 dark:text-slate-500 italic text-xs">No groups</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 text-slate-400">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
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
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 ${
                    errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                  }`}
                  placeholder="user@example.com"
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Full Name</label>
                <input
                  {...register('full_name', { required: 'Full name is required' })}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 ${
                    errors.full_name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                  }`}
                  placeholder="John Doe"
                />
                {errors.full_name && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                  {editingUser ? 'Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  {...register('password', { required: !editingUser ? 'Password is required' : false })}
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-4 focus:ring-brand/10 transition-all text-sm font-medium dark:text-slate-100 ${
                    errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium ml-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">Assign Groups</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {groups?.map(group => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        selectedGroupIds.includes(group.id)
                          ? 'bg-brand/5 dark:bg-brand/10 border-brand text-brand ring-1 ring-brand/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedGroupIds.includes(group.id) ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                          <GroupsIcon size={16} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">{group.name}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{group.description}</div>
                        </div>
                      </div>
                      {selectedGroupIds.includes(group.id) && <Shield size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="w-4 h-4 text-brand border-slate-300 dark:border-slate-700 rounded focus:ring-brand dark:bg-slate-900"
                />
                <label htmlFor="is_active" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer">Active Account</label>
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
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
