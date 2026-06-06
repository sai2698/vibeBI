import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { 
  Search, Database, Layers, ArrowRight, Clock
} from 'lucide-react';
import { useLOBStore } from '../../store/useLOBStore';

const SelfServiceHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search data marts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarts.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
                No data marts match your search or you don't have access to any.
              </div>
            ) : (
              filteredMarts.map((dm: any) => (
                <div
                  key={dm.id}
                  onClick={() => navigate(`/self-service/${dm.id}`)}
                  className="card group hover:shadow-md transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-800 flex flex-col h-full"
                >
                  <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group-hover:border-brand/20 transition-colors relative overflow-hidden">
                    <Database size={40} className="text-slate-200 dark:text-slate-700 group-hover:text-brand/20 transition-colors z-10" />
                    
                    <div className="absolute bottom-3 right-3 flex -space-x-2 z-20">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 border-2 border-white dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                        <Layers size={14} />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                        +{dm.datasets?.length || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand transition-colors text-lg">{dm.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">{dm.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        <Clock size={12} />
                        Updated {new Date(dm.updated_at || dm.created_at).toLocaleDateString()}
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
        </div>
      )}
    </div>
  );
};

export default SelfServiceHub;
