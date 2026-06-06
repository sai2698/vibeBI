import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api';
import { Plus, Database, Edit2, Trash2, TableProperties, Network, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DatasetFormModal from './DatasetFormModal';
import { useLOBStore } from '../../store/useLOBStore';

interface Dataset {
  id: number;
  name: string;
  datasource_id: number;
  schema_name: string | null;
  table_name: string | null;
  created_at: string;
  dataset_type?: string;
}

const DatasetListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'flow'>('all');

  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  const { data: datasets, isLoading } = useQuery<Dataset[]>({
    queryKey: ['datasets', activeLOB?.id],
    queryFn: async () => {
      const response = await api.get('/api/datasets/', { params: { lob_id: activeLOB?.id } });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/datasets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset deleted');
    },
    onError: () => toast.error('Failed to delete dataset')
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (ds: Dataset) => {
    if (ds.dataset_type === 'flow') {
      navigate(`/data/dataflow?id=${ds.id}`);
    } else {
      setEditingDataset(ds);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDataset(null);
  };

  const filteredDatasets = useMemo(() => {
    if (!datasets) return [];
    let filtered = datasets;
    
    if (typeFilter === 'flow') {
      filtered = filtered.filter(ds => ds.dataset_type === 'flow');
    } else if (typeFilter === 'table') {
      filtered = filtered.filter(ds => ds.dataset_type !== 'flow');
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ds => 
        ds.name.toLowerCase().includes(q) || 
        (ds.table_name && ds.table_name.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  }, [datasets, searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDatasets.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginated = filteredDatasets.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TableProperties size={24} className="text-brand" /> Datasets
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage semantic layers and data tables</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={(e) => {
              if (!activeLOB) {
                e.preventDefault();
                toast.error('Please select or create a Line of Business (LOB) first.');
                return;
              }
              navigate('/data/dataflow');
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Network size={16} />
            Dataflow
          </button>
          <button 
            onClick={() => { 
              if (!activeLOB) {
                toast.error('Please select or create a Line of Business (LOB) first.');
                return;
              }
              setEditingDataset(null); 
              setIsModalOpen(true); 
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Dataset
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shrink-0 shadow-sm">
          <button
            onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${typeFilter === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            All
          </button>
          <button
            onClick={() => { setTypeFilter('table'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${typeFilter === 'table' ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <Database size={14} /> Standard
          </button>
          <button
            onClick={() => { setTypeFilter('flow'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${typeFilter === 'flow' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <Network size={14} /> Dataflow
          </button>
        </div>
      </div>

      <div className="card dark:bg-slate-900 dark:border-slate-800 overflow-hidden p-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Dataset Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Source Table</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                      <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-brand rounded-full animate-spin" />
                      Loading datasets...
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <TableProperties size={32} className="text-slate-300 dark:text-slate-700" />
                      <p>No datasets found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((ds) => {
                  const isFlow = ds.dataset_type === 'flow';
                  return (
                    <tr key={ds.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                          {isFlow ? <Network size={16} className="text-emerald-500" /> : <Database size={16} className="text-sky-500" />}
                          {ds.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${isFlow ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400'}`}>
                          {isFlow ? 'Dataflow' : 'Standard'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono border border-slate-200 dark:border-slate-700/50">
                          {isFlow ? (
                            <>
                              <Network size={12} /> Managed Dataflow
                            </>
                          ) : (
                            <>
                              <Database size={12} /> {ds.schema_name ? `${ds.schema_name}.` : ''}{ds.table_name || 'Custom SQL'}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(ds.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(ds)}
                            className="p-1.5 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ds.id)}
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
        {filteredDatasets.length > pageSize && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="text-slate-900 dark:text-white">{(activePage - 1) * pageSize + 1}</span> to{' '}
              <span className="text-slate-900 dark:text-white">{Math.min(activePage * pageSize, filteredDatasets.length)}</span> of{' '}
              <span className="text-slate-900 dark:text-white">{filteredDatasets.length}</span> datasets
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

      <DatasetFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCloseModal}
        editDataset={editingDataset}
      />
    </div>
  );
};

export default DatasetListPage;
