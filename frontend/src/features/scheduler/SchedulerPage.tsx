import React, { useState } from 'react';
import { Clock, Plus, Trash2, Play, Calendar, Loader2, List, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import toast from 'react-hot-toast';
import ScheduleModal from './ScheduleModal';

interface Schedule {
  id: number;
  name: string;
  target_type: string;
  target_id: number;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
}

interface JobLog {
    id: number;
    job_id: string;
    task_name: string;
    run_at: string;
    finished_at: string | null;
    status: string;
    message: string;
    execution_time_ms: number;
}

const SchedulerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'schedules' | 'logs'>('schedules');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const logPageSize = 10;

  const { data: schedules, isLoading: isLoadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get('/api/schedules/');
      return response.data;
    },
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery<JobLog[]>({
    queryKey: ['job-logs'],
    queryFn: async () => {
        const response = await api.get('/api/schedules/logs');
        return response.data;
    },
    enabled: activeTab === 'logs'
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted');
    },
  });

  const runMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/schedules/${id}/run`),
    onSuccess: () => {
        toast.success('Report task triggered!');
        queryClient.invalidateQueries({ queryKey: ['job-logs'] });
    },
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-brand/10 dark:bg-brand/20 rounded-xl text-brand">
              <Clock size={24} />
            </div>
            Scheduler Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Orchestrate and audit automated reports and refreshes</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all transform active:scale-95"
        >
          <Plus size={20} /> Create New Schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit border dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'schedules' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
              <Calendar size={18} /> Active Schedules
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'logs' ? 'bg-white dark:bg-slate-700 text-brand shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
              <Activity size={18} /> Execution Logs
          </button>
      </div>

      {activeTab === 'schedules' ? (
          isLoadingSchedules ? <Loader2 className="animate-spin text-brand mx-auto mt-20" size={48} /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules?.map((sched) => (
                    <div key={sched.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand/20 transition-all duration-300 overflow-hidden flex flex-col">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    sched.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                }`}>
                                    {sched.is_active ? 'Active' : 'Paused'}
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                    <Clock size={14} />
                                    <span className="text-xs font-mono font-bold tracking-tighter">{sched.cron_expression}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2 group-hover:text-brand transition-colors line-clamp-1">
                                {sched.name}
                            </h3>
                            
                            <div className="space-y-3 mt-4">
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] font-black">Target</span>
                                    <span className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 uppercase tracking-tighter text-[9px] font-bold">
                                        {sched.target_type} #{sched.target_id}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px] font-black">Last Run</span>
                                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-bold">
                                        {sched.last_run_at ? new Date(sched.last_run_at).toLocaleString() : 'Never'}
                                        {sched.last_run_status === 'SUCCESS' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto p-4 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => runMutation.mutate(sched.id)}
                                className="flex items-center justify-center gap-2 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand transition-all shadow-sm"
                            >
                                <Play size={14} /> Run Now
                            </button>
                            <button 
                                onClick={() => {
                                    if (window.confirm('Delete this schedule?')) {
                                        deleteMutation.mutate(sched.id);
                                    }
                                }}
                                className="flex items-center justify-center gap-2 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all shadow-sm"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          )
      ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <List size={18} className="text-brand" />
                      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Audit Trail (Last 100 Runs)</h2>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          <tr>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Task Name</th>
                              <th className="px-6 py-4">Executed At</th>
                              <th className="px-6 py-4">Duration</th>
                              <th className="px-6 py-4">Message</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {isLoadingLogs ? (
                              <tr>
                                  <td colSpan={5} className="py-12 text-center">
                                      <Loader2 className="animate-spin text-brand mx-auto" size={32} />
                                  </td>
                              </tr>
                          ) : (
                              (() => {
                                  const totalLogPages = logs ? Math.ceil(logs.length / logPageSize) : 1;
                                  const activeLogPage = Math.min(logPage, totalLogPages);
                                  const startLogIdx = (activeLogPage - 1) * logPageSize;
                                  const endLogIdx = startLogIdx + logPageSize;
                                  const paginatedLogs = logs ? logs.slice(startLogIdx, endLogIdx) : [];

                                  return paginatedLogs.map(log => (
                                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                          <td className="px-6 py-4">
                                              {log.status === 'SUCCESS' ? (
                                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                                      <CheckCircle2 size={14} /> Success
                                                  </div>
                                              ) : log.status === 'FAILURE' ? (
                                                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs">
                                                      <XCircle size={14} /> Failed
                                                  </div>
                                              ) : (
                                                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                      <Loader2 size={14} className="animate-spin" /> Running
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200">{log.task_name}</td>
                                          <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                              {new Date(log.run_at).toLocaleString()}
                                          </td>
                                          <td className="px-6 py-4 text-xs text-slate-400 dark:text-slate-500 font-mono">
                                              {log.execution_time_ms}ms
                                          </td>
                                          <td className="px-6 py-4 text-[10px] text-slate-500 dark:text-slate-400 max-w-xs truncate font-medium">
                                              {log.message}
                                          </td>
                                      </tr>
                                  ));
                              })()
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Pagination Bar for Logs */}
              {logs && logs.length > logPageSize && (
                  <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Showing <span className="text-slate-800 dark:text-slate-200">{(Math.min(logPage, Math.ceil(logs.length / logPageSize)) - 1) * logPageSize + 1}</span> to{' '}
                          <span className="text-slate-800 dark:text-slate-200">{Math.min(Math.min(logPage, Math.ceil(logs.length / logPageSize)) * logPageSize, logs.length)}</span> of{' '}
                          <span className="text-slate-800 dark:text-slate-200">{logs.length}</span> logs
                      </div>
                      <div className="flex items-center gap-2">
                          <button
                              onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                              disabled={logPage === 1}
                              className={`px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                                  logPage === 1 
                                      ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-950' 
                                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                          >
                              Previous
                          </button>
                          <div className="flex items-center gap-1">
                              {(() => {
                                  const totalPgs = Math.ceil(logs.length / logPageSize);
                                  const startPg = Math.max(1, logPage - 2);
                                  const endPg = Math.min(totalPgs, startPg + 4);
                                  const visiblePages = Array.from({ length: endPg - startPg + 1 }, (_, i) => startPg + i);

                                  return visiblePages.map(page => (
                                      <button
                                          key={page}
                                          onClick={() => setLogPage(page)}
                                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                              logPage === page
                                                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                          }`}
                                      >
                                          {page}
                                      </button>
                                  ));
                              })()}
                          </div>
                          <button
                              onClick={() => setLogPage(prev => Math.min(prev + 1, Math.ceil(logs.length / logPageSize)))}
                              disabled={logPage === Math.ceil(logs.length / logPageSize)}
                              className={`px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                                  logPage === Math.ceil(logs.length / logPageSize) 
                                      ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-950' 
                                      : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                          >
                              Next
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      <ScheduleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['schedules'] })}
      />
    </div>
  );
};

export default SchedulerPage;
