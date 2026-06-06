import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, X, Save, Edit2, Trash2, Search, TableProperties } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';
import MultiSelect from '../../components/ui/MultiSelect';

interface RLS {
  id: number;
  name: string;
  description: string;
  filter_type: 'regular' | 'base';
  dataset_ids: number[];
  clause: string;
  role_ids: number[];
}

const RLSManagementPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRLS, setEditingRLS] = useState<RLS | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState<Partial<RLS>>({
    name: '',
    description: '',
    filter_type: 'regular',
    dataset_ids: [],
    clause: '',
    role_ids: []
  });

  const { data: rules, isLoading } = useQuery<RLS[]>({
    queryKey: ['rls_rules'],
    queryFn: async () => {
      const res = await api.get('/api/rls/');
      return res.data;
    }
  });

  const { data: datasets } = useQuery<any[]>({
    queryKey: ['datasets'],
    queryFn: async () => {
      const res = await api.get('/api/datasets/');
      return res.data;
    }
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/api/roles/');
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<RLS>) => {
      if (editingRLS) {
        return await api.put(`/api/rls/${editingRLS.id}`, data);
      }
      return await api.post('/api/rls/', data);
    },
    onSuccess: () => {
      toast.success(editingRLS ? 'RLS rule updated' : 'RLS rule created');
      queryClient.invalidateQueries({ queryKey: ['rls_rules'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save RLS rule');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/rls/${id}`);
    },
    onSuccess: () => {
      toast.success('RLS rule deleted');
      queryClient.invalidateQueries({ queryKey: ['rls_rules'] });
      setDeleteId(null);
    }
  });

  const openModal = (rule?: RLS) => {
    if (rule) {
      setEditingRLS(rule);
      setFormData(rule);
    } else {
      setEditingRLS(null);
      setFormData({
        name: '',
        description: '',
        filter_type: 'regular',
        dataset_ids: [],
        clause: '',
        role_ids: []
      });
    }
    setIsModalOpen(true);
  };

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (!searchQuery) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(r => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
  }, [rules, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginated = filteredRules.slice(startIndex, startIndex + pageSize);

  const datasetOptions = useMemo(() => datasets?.map(d => d.name) || [], [datasets]);
  const roleOptions = useMemo(() => roles?.map(r => r.name) || [], [roles]);

  const selectedDatasetNames = useMemo(() => {
    return formData.dataset_ids?.map(id => datasets?.find(d => d.id === id)?.name).filter(Boolean) as string[] || [];
  }, [formData.dataset_ids, datasets]);

  const selectedRoleNames = useMemo(() => {
    return formData.role_ids?.map(id => roles?.find(r => r.id === id)?.name).filter(Boolean) as string[] || [];
  }, [formData.role_ids, roles]);

  const handleDatasetsChange = (names: string[]) => {
    const ids = names.map(n => datasets?.find(d => d.name === n)?.id).filter(Boolean) as number[];
    setFormData({ ...formData, dataset_ids: ids });
  };

  const handleRolesChange = (names: string[]) => {
    const ids = names.map(n => roles?.find(r => r.name === n)?.id).filter(Boolean) as number[];
    setFormData({ ...formData, role_ids: ids });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={24} className="text-brand" /> Row Level Security
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage data access rules at the row level for specific roles.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => openModal()}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Create Rule
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="card dark:bg-slate-900 dark:border-slate-800 overflow-hidden p-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Rule Details</th>
                <th className="px-6 py-4">Datasets</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                      <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-brand rounded-full animate-spin" />
                      Loading rules...
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Shield size={32} className="text-slate-300 dark:text-slate-700" />
                      <p>No RLS rules defined.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((rule) => {
                  const dsNames = rule.dataset_ids?.map(id => datasets?.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                  return (
                    <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white mb-1">{rule.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{rule.description || 'No description provided'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TableProperties size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]" title={dsNames}>
                            {dsNames || `${rule.dataset_ids?.length || 0} datasets`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${rule.filter_type === 'base' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                          {rule.filter_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {rule.role_ids?.length || 0} roles
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openModal(rule)}
                            className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(rule.id)}
                            className="p-1.5 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredRules.length > pageSize && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="text-slate-900 dark:text-white">{(activePage - 1) * pageSize + 1}</span> to{' '}
              <span className="text-slate-900 dark:text-white">{Math.min(activePage * pageSize, filteredRules.length)}</span> of{' '}
              <span className="text-slate-900 dark:text-white">{filteredRules.length}</span> rules
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                  activePage === 1 
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800 text-slate-400' 
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    activePage === page
                      ? 'bg-brand text-white shadow-md shadow-brand/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                  activePage === totalPages 
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800 text-slate-400' 
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{editingRLS ? 'Edit RLS Rule' : 'Create RLS Rule'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Rule Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                    placeholder="e.g. EMEA Sales Only"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <input 
                    type="text" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                    placeholder="Brief description of the rule..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Apply to Datasets</label>
                <div className="w-full">
                  <MultiSelect 
                    options={datasetOptions}
                    selectedValues={selectedDatasetNames}
                    onChange={handleDatasetsChange}
                    placeholder="Search and select datasets..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Apply to Roles</label>
                <div className="w-full">
                  <MultiSelect 
                    options={roleOptions}
                    selectedValues={selectedRoleNames}
                    onChange={handleRolesChange}
                    placeholder="Search and select roles..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter Type</label>
                <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer group flex-1">
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        checked={formData.filter_type === 'regular'} 
                        onChange={() => setFormData({...formData, filter_type: 'regular'})} 
                        className="text-brand focus:ring-brand w-4 h-4 cursor-pointer" 
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-brand transition-colors">Regular</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Grants access. Adds a WHERE clause only if the user belongs to any of the selected roles.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer group flex-1">
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        checked={formData.filter_type === 'base'} 
                        onChange={() => setFormData({...formData, filter_type: 'base'})} 
                        className="text-brand focus:ring-brand w-4 h-4 cursor-pointer" 
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-brand transition-colors">Base</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Restricts access. Adds a WHERE clause to all users EXCEPT for those in the selected roles.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">SQL Clause (Jinja Templating Supported)</label>
                <textarea 
                  value={formData.clause || ''} 
                  onChange={e => setFormData({ ...formData, clause: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 text-sm font-mono text-slate-900 dark:text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all h-32"
                  placeholder='e.g. "region" = &#39;EMEA&#39; OR "email" = &#39;{{ current_user.email }}&#39;'
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
              <button 
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.name || !formData.dataset_ids?.length || !formData.clause || saveMutation.isPending}
                className="px-4 py-2 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark disabled:opacity-50 flex items-center gap-2 transition-all shadow-md shadow-brand/20 active:scale-95"
              >
                <Save size={16} /> Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete RLS Rule"
        message="Are you sure you want to delete this Row Level Security rule?"
        itemName="this rule"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default RLSManagementPage;
