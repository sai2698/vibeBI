import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api';
import { Plus, Database, Edit2, Trash2, Plug, HardDrive, Settings } from 'lucide-react';
import { DatasourceFormModal } from './DatasourceFormModal';

interface Datasource {
  id: number;
  name: string;
  engine: string;
  connection_uri: string;
  created_at: string;
}

const engineIcons: Record<string, React.ReactNode> = {
  postgres: <Database size={24} className="text-blue-500" />,
  mysql: <Database size={24} className="text-orange-500" />,
  sqlite: <HardDrive size={24} className="text-slate-500" />,
  custom: <Settings size={24} className="text-slate-600" />,
  bigquery: <Database size={24} className="text-blue-400" />,
};

const DatasourceListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: datasources, isLoading } = useQuery<Datasource[]>({
    queryKey: ['datasources'],
    queryFn: async () => {
      const response = await api.get('/api/datasources/');
      return response.data;
    },
  });

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingDatasource, setEditingDatasource] = React.useState<Datasource | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/datasources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      toast.success('Connection deleted');
    },
    onError: () => toast.error('Failed to delete connection')
  });

  const handleEdit = (ds: Datasource) => {
    setEditingDatasource(ds);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDatasource(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plug size={24} className="text-brand" /> Datasources
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage external database connections</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Connection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">Loading datasources...</div>
        ) : datasources?.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
            <Plug size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No Connections Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Connect your first database to start analyzing data.</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={18} />
              Add Connection
            </button>
          </div>
        ) : (
          datasources?.map((ds) => (
            <div key={ds.id} className="card dark:bg-slate-900 dark:border-slate-800 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {engineIcons[ds.engine.toLowerCase()] || <Database size={24} className="text-slate-500 dark:text-slate-400" />}
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(ds)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-brand transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(ds.id)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{ds.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{ds.engine}</p>
              
              <div className="mt-auto pt-6 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
                <span>Added {new Date(ds.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Connected
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <DatasourceFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        editingDatasource={editingDatasource}
      />
    </div>
  );
};

export default DatasourceListPage;
