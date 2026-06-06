import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Plus, Edit2, Trash2, Globe, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

interface LOB {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

interface LOBFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
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

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<LOBFormData>();

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
              <th className="px-6 py-4 font-medium text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">Loading LOBs...</td>
              </tr>
            ) : lobs?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">No LOBs found</td>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{editingLob ? 'Edit LOB' : 'Add New LOB'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
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
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">LOB Accent Color</label>
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
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingLob ? 'Update' : 'Create')}
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
