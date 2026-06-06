import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../../api';
import { ShieldAlert, Calendar, Settings } from 'lucide-react';
import AuditSettingsModal from './AuditSettingsModal';
import MultiSelect from '../../components/ui/MultiSelect';

const ACTION_MAP: Record<string, string> = {
  "SQL Lab Executions": "execute_sqllab",
  "Chart Executions": "execute_chart",
  "AI Interactions": "query_bot",
  "Dashboard Views": "view_dashboard",
  "Dashboard Filter Applies": "dashboard_filter_apply",
  "Datamart Queries": "query_datamart"
};
const ACTION_LABELS = Object.keys(ACTION_MAP);

const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [actionFilters, setActionFilters] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilters, setUserFilters] = useState<string[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/api/users');
      return res.data;
    }
  });

  const userNameToIdMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    usersData?.forEach((u: any) => {
      map[u.full_name || u.email] = u.id;
    });
    return map;
  }, [usersData]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilters, startDate, endDate, userFilters],
    queryFn: async () => {
      const params: any = { skip: page * limit, limit };
      
      const mappedActions = actionFilters.map(l => ACTION_MAP[l]).filter(Boolean);
      if (mappedActions.length > 0) {
        // use duplicate query params for list (FastAPI style)
        params.action = mappedActions;
      }
      
      const mappedUsers = userFilters.map(n => userNameToIdMap[n]).filter(Boolean);
      if (mappedUsers.length > 0) {
        params.user_id = mappedUsers;
      }
      
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.end_date = end.toISOString();
      }
      
      const res = await api.get('/api/audit-logs', { 
        params, 
        paramsSerializer: { indexes: null } // Serialize arrays like action=x&action=y
      });
      return res.data;
    },
    placeholderData: keepPreviousData
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={24} className="text-brand" /> Security & Audit Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Monitor platform activity, user interactions, and security events</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings size={16} />
            Audit Settings
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-6">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action:</span>
            <MultiSelect 
              options={ACTION_LABELS}
              selectedValues={actionFilters}
              onChange={(vals) => { setActionFilters(vals); setPage(0); }}
              placeholder="All Actions"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User:</span>
            <MultiSelect 
              options={Object.keys(userNameToIdMap)}
              selectedValues={userFilters}
              onChange={(vals) => { setUserFilters(vals); setPage(0); }}
              placeholder="All Users"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand/40 hidden md:flex">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer font-medium"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            />
            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold px-1">to</span>
            <input 
              type="date" 
              className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer font-medium"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            />
          </div>

        </div>
      </div>

      <div className="card dark:bg-slate-900 dark:border-slate-800 overflow-hidden p-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 w-48">Timestamp</th>
                <th className="px-6 py-4 w-64">User</th>
                <th className="px-6 py-4 w-48">Action</th>
                <th className="px-6 py-4 w-48">Entity ID</th>
                <th className="px-6 py-4">Context Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                      <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-brand rounded-full animate-spin" />
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <ShieldAlert size={32} className="text-slate-300 dark:text-slate-700" />
                      <p>No audit logs found matching criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group items-start">
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {new Date(log.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString(undefined, { hour12: false })}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner font-bold uppercase">
                          {(log.user_name || 'Sys')[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{log.user_name || 'System'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.user_email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono border border-slate-200 dark:border-slate-700/50 break-all max-w-[200px]">
                        {log.entity_id || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap border border-slate-200 dark:border-slate-700 custom-scrollbar shadow-inner">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {(data?.total || 0) > limit && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="text-slate-900 dark:text-white">{(page * limit) + 1}</span> to{' '}
              <span className="text-slate-900 dark:text-white">{Math.min((page + 1) * limit, data?.total || 0)}</span> of{' '}
              <span className="text-slate-900 dark:text-white">{data?.total || 0}</span> logs
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                  page === 0 
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800 text-slate-400' 
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Prev
              </button>
              
              <div className="hidden sm:flex items-center gap-1 px-2">
                {(() => {
                  const current = page + 1;
                  const total = Math.max(1, totalPages);
                  const delta = 1;
                  const range = [];
                  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
                    range.push(i);
                  }
                  if (current - delta > 2) range.unshift("...");
                  if (current + delta < total - 1) range.push("...");
                  range.unshift(1);
                  if (total > 1) range.push(total);

                  return range.map((pageNum, idx) => (
                    pageNum === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => setPage((pageNum as number) - 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          current === pageNum
                            ? 'bg-brand text-white shadow-md shadow-brand/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ));
                })()}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                  page >= totalPages - 1 
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
      
      <AuditSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default AuditLogPage;
