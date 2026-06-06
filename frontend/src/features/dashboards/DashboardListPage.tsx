import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Plus, LayoutDashboard, Star, Clock, Trash2, Edit2, X, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLOBStore } from '../../store/useLOBStore';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

interface Dashboard {
  id: number;
  title: string;
  description: string | null;
  lob_id: number | null;
  layout: any;
  is_public: boolean;
  is_featured: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface DashboardFormData {
  title: string;
  description: string;
  lob_id: string; // Using string for select value compatibility
  is_public: boolean;
  is_featured: boolean;
}

const DashboardListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [deletingDashboardId, setDeletingDashboardId] = useState<number | null>(null);
  const { activeLOB } = useLOBStore();

  const { data: dashboards, isLoading } = useQuery<Dashboard[]>({
    queryKey: ['dashboards', activeLOB?.id],
    queryFn: async () => {
      const response = await api.get('/api/dashboards/', {
        params: { lob_id: activeLOB?.id }
      });
      return response.data;
    },
  });

  const { data: lobs } = useQuery<any[]>({
    queryKey: ['lobs'],
    queryFn: async () => {
      const response = await api.get('/api/lob/');
      return response.data;
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DashboardFormData>();

  const createMutation = useMutation({
    mutationFn: (newDash: DashboardFormData) => api.post('/api/dashboards/', { ...newDash, lob_id: newDash.lob_id ? Number(newDash.lob_id) : null, layout: [] }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setIsModalOpen(false);
      reset();
      toast.success('Dashboard created successfully!');
      navigate(`/dashboards/${response.data.id}`); // Go to builder
    },
    onError: () => toast.error('Failed to create dashboard')
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; dash: DashboardFormData }) => api.patch(`/api/dashboards/${data.id}`, { ...data.dash, lob_id: data.dash.lob_id ? Number(data.dash.lob_id) : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setIsModalOpen(false);
      setEditingDashboard(null);
      reset();
      toast.success('Dashboard updated successfully!');
    },
    onError: () => toast.error('Failed to update dashboard')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setDeletingDashboardId(null);
      toast.success('Dashboard deleted');
    },
    onError: () => {
      setDeletingDashboardId(null);
      toast.error('Failed to delete dashboard');
    }
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/dashboards/${id}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    favoriteMutation.mutate(id);
  };

  const onSubmit = (data: DashboardFormData) => {
    if (editingDashboard) {
      updateMutation.mutate({ id: editingDashboard.id, dash: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (e: React.MouseEvent, dash: Dashboard) => {
    e.stopPropagation();
    setEditingDashboard(dash);
    setValue('title', dash.title);
    setValue('description', dash.description || '');
    setValue('lob_id', dash.lob_id ? String(dash.lob_id) : '');
    setValue('is_public', dash.is_public);
    setValue('is_featured', dash.is_featured);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingDashboard(null);
    reset({
      title: '',
      description: '',
      lob_id: activeLOB ? String(activeLOB.id) : '',
      is_public: false,
      is_featured: false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingDashboardId(id);
  };
  const [activeTab, setActiveTab] = useState<'home' | 'all'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDashboards = dashboards?.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div 
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutDashboard size={24} className="text-brand" />
              {activeLOB ? activeLOB.name : 'Dashboards'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {activeLOB ? `Manage analytics for ${activeLOB.name}` : 'Browse and manage your analytics dashboards'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="relative group">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand transition-colors" />
              <input
                type="text"
                placeholder="Search dashboards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand/20 w-full sm:w-64 transition-all focus:bg-white dark:focus:bg-slate-900 focus:shadow-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              onClick={() => {
                if (!activeLOB) {
                  toast.error('Please select or create a Line of Business (LOB) first.');
                  return;
                }
                openCreateModal();
              }}
              className="btn-primary flex justify-center items-center gap-2"
            >
              <Plus size={18} /> New Dashboard
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex justify-start md:justify-center overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'home'
                  ? 'bg-white dark:bg-slate-700 text-brand shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-brand shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              All Dashboards
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : activeTab === 'home' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Featured Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Star size={14} className="text-amber-500" /> Featured Dashboards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDashboards?.filter(d => d.is_featured).length === 0 ? (
                  <div className="col-span-full py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
                    No featured dashboards match your search.
                  </div>
                ) : (
                  filteredDashboards?.filter(d => d.is_featured).map((dash) => (
                      <div
                        key={dash.id}
                        onClick={() => navigate(`/dashboards/${dash.id}`)}
                        className="card group hover:shadow-md transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                      >
                        <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4 border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:border-brand/20 transition-colors relative">
                          <LayoutDashboard size={32} className="text-slate-200 dark:text-slate-700 group-hover:text-brand/20 transition-colors" />
                          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => toggleFavorite(e, dash.id)}
                              className="p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all transform active:scale-90"
                            >
                              <Star size={14} className={dash.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, dash.id)}
                              className="p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all transform active:scale-90"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand">{dash.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{dash.description}</p>
                      </div>
                    ))
                  )}
                </div>

                <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 pt-4">
                <Clock size={14} className="text-slate-400 dark:text-slate-500" /> Recent Updates
              </h2>
              <div className="space-y-3">
                {filteredDashboards?.slice(0, 3).map(dash => (
                  <div
                    key={dash.id}
                    onClick={() => navigate(`/dashboards/${dash.id}`)}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand/20 dark:hover:border-brand/40 hover:shadow-sm cursor-pointer transition-all group/recent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand/5 dark:bg-brand/10 rounded-lg flex items-center justify-center text-brand">
                        <LayoutDashboard size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{dash.title}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Updated {new Date(dash.updated_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star size={14} className={dash.is_featured ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-700'} />
                      <button
                        onClick={(e) => handleDelete(e, dash.id)}
                        className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover/recent:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-brand rounded-2xl p-6 text-white shadow-lg shadow-brand/20 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-bold text-lg mb-2">Workspace Insight</h3>
                  <p className="text-brand-light dark:text-slate-200 text-sm leading-relaxed mb-4">
                    You have {filteredDashboards?.length} dashboards visible in this scope.
                  </p>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-10">
                  <LayoutDashboard size={120} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* All Dashboards View */}
          <div className="card dark:bg-slate-900 dark:border-slate-800 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Dashboard Name</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Visibility</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Updated</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDashboards?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      No dashboards found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredDashboards?.map((dash) => (
                    <tr
                      key={dash.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboards/${dash.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => toggleFavorite(e, dash.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Star size={14} className={dash.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'} />
                          </button>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{dash.title}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{dash.description || 'No description'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {dash.is_public && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Public</span>}
                          {dash.is_featured && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Featured</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 tabular-nums">
                        {new Date(dash.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={(e) => openEditModal(e, dash)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-brand dark:hover:text-brand hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                          <button onClick={(e) => handleDelete(e, dash.id)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-transparent dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">{editingDashboard ? 'Edit Dashboard' : 'Create New Dashboard'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  className={`w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-brand'
                    }`}
                  placeholder="e.g. Sales Performance"
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Line of Business (LOB)</label>
                <select
                  {...register('lob_id')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand appearance-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">No LOB (Global)</option>
                  {lobs?.map(lob => (
                    <option key={lob.id} value={lob.id} className="dark:bg-slate-900">{lob.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand h-20 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="Summary of the dashboard metrics"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    {...register('is_public')}
                    className="w-4 h-4 text-brand border-slate-300 dark:border-slate-600 rounded focus:ring-brand dark:bg-slate-800"
                  />
                  <label htmlFor="is_public" className="text-sm font-medium text-slate-700 dark:text-slate-300">Public Access</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    {...register('is_featured')}
                    className="w-4 h-4 text-brand border-slate-300 dark:border-slate-600 rounded focus:ring-brand dark:bg-slate-800"
                  />
                  <label htmlFor="is_featured" className="text-sm font-medium text-slate-700 dark:text-slate-300">Featured</label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingDashboard ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <DeleteConfirmationModal
        isOpen={deletingDashboardId !== null}
        onClose={() => setDeletingDashboardId(null)}
        onConfirm={() => deletingDashboardId && deleteMutation.mutate(deletingDashboardId)}
        title="Delete Dashboard"
        message="Are you sure you want to delete the dashboard"
        itemName={dashboards?.find(d => d.id === deletingDashboardId)?.title}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default DashboardListPage;
