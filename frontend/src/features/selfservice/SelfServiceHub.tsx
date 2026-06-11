import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { 
  Search, Database, Layers, ArrowRight, Clock, LayoutGrid, List
} from 'lucide-react';
import { useLOBStore } from '../../store/useLOBStore';

const SelfServiceHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const activeLOB = useLOBStore((state: any) => state.activeLOB);

  const { data: datamarts = [], isLoading } = useQuery({
    queryKey: ['datamarts', activeLOB?.id],
    queryFn: async () => (await api.get('/api/datamarts/', { params: { lob_id: activeLOB?.id } })).data
  });

  const filteredMarts = datamarts?.filter((dm: any) => 
    dm.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div 
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-brand" /> Data Mart Catalog
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Browse and explore curated semantic data models</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-fit">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          <div className="relative w-full sm:w-64 md:w-80 group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              placeholder="Search data marts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {viewMode === 'list' ? (
            <div className="card dark:bg-slate-900 dark:border-slate-800 overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Data Mart Name</th>
                      <th className="px-6 py-4">Datasets</th>
                      <th className="px-6 py-4">Updated</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredMarts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          No data marts match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredMarts.map((dm: any) => (
                        <tr
                          key={dm.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/self-service/${dm.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                <Database size={14} />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{dm.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md truncate">{dm.description || 'No description'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md text-xs font-medium">
                              <Layers size={12} />
                              {dm.datasets?.length || 0} Datasets
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 tabular-nums text-xs font-medium">
                            {new Date(dm.updated_at || dm.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-brand flex items-center justify-end gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                              Explore <ArrowRight size={14} />
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredMarts.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
                  No data marts match your search or you don't have access to any.
                </div>
              ) : (
                filteredMarts.map((dm: any) => (
                  <div
                    key={dm.id}
                    onClick={() => navigate(`/self-service/${dm.id}`)}
                    className="card p-4 group hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-800 flex flex-col h-full border border-slate-200"
                  >
                    <div className="h-28 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 rounded-lg mb-3 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group-hover:border-brand/30 transition-all relative overflow-hidden">
                      <Database size={28} className="text-slate-300 dark:text-slate-600 group-hover:text-brand/50 transition-colors z-10 transform group-hover:scale-110 duration-300" />
                      
                      <div className="absolute bottom-2 right-2 flex -space-x-1.5 z-20">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/40 border-2 border-white dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm backdrop-blur-sm">
                          <Layers size={12} />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-sm">
                          +{dm.datasets?.length || 0}
                        </div>
                      </div>
                      
                      {/* Decorative elements */}
                      <div className="absolute -top-4 -left-4 w-16 h-16 bg-brand/5 rounded-full blur-xl group-hover:bg-brand/10 transition-colors"></div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-brand transition-colors text-base line-clamp-1">{dm.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 flex-1">{dm.description}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                          <Clock size={12} />
                          {new Date(dm.updated_at || dm.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-brand flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                          Explore <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelfServiceHub;
