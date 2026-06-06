import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { Database, Plus, Trash2, Edit3, Save, X, Shield, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLOBStore } from '../../../store/useLOBStore';

const DataMartsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const activeLOB = useLOBStore((state: any) => state.activeLOB);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

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
    } else {
      setEditingId(-1);
      setFormData({ name: 'New Data Mart', description: '', role_ids: [], dataset_ids: [], lob_id: activeLOB?.id });
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-900/50">
      {/* List */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold">Data Marts</h2>
          <button onClick={() => openEditor()} className="p-1.5 bg-brand text-white rounded hover:bg-brand-dark transition-colors"><Plus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {datamarts.length === 0 && <p className="text-sm text-slate-400 text-center py-10">No data marts found.</p>}
          {datamarts.map((dm: any) => (
            <div key={dm.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Database size={16} className="text-brand" /> {dm.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEditor(dm)} className="p-1 text-slate-400 hover:text-brand"><Edit3 size={14}/></button>
                  <button onClick={() => deleteMut.mutate(dm.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">{dm.description}</p>
              <div className="flex gap-3 text-[10px] font-bold text-slate-400 uppercase">
                <span className="flex items-center gap-1"><Layers size={12}/> {dm.datasets?.length || 0} Datasets</span>
                <span className="flex items-center gap-1"><Shield size={12}/> {dm.role_ids?.length || 0} Roles</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
        {editingId !== null ? (
          <div className="max-w-2xl mx-auto w-full p-8 space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId === -1 ? 'Create Data Mart' : 'Edit Data Mart'}</h2>
              <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"><X size={20}/></button>
            </div>
            
            <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name</label>
                <input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Layers size={14}/> Included Datasets</label>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  {datasets.map((d: any) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.dataset_ids.includes(d.id)}
                        onChange={(e) => {
                          const ids = e.target.checked 
                            ? [...formData.dataset_ids, d.id] 
                            : formData.dataset_ids.filter((id: number) => id !== d.id);
                          setFormData({...formData, dataset_ids: ids});
                        }}
                      />
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-[10px] text-slate-400">({d.table_name})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Shield size={14}/> Allowed Roles</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r: any) => (
                    <label key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-colors ${formData.role_ids.includes(r.id) ? 'bg-brand/10 border-brand text-brand' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={formData.role_ids.includes(r.id)}
                        onChange={(e) => {
                          const ids = e.target.checked 
                            ? [...formData.role_ids, r.id] 
                            : formData.role_ids.filter((id: number) => id !== r.id);
                          setFormData({...formData, role_ids: ids});
                        }}
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
              <button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="flex items-center gap-2 px-6 py-2 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark transition-colors">
                <Save size={16}/> Save Data Mart
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Database size={48} className="opacity-20 mb-4" />
            <p className="font-bold">Select or Create a Data Mart</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMartsManager;
