import React from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useThemeStore } from '../../store/useThemeStore';
import CommandPalette from '../ui/CommandPalette';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { ShieldAlert } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { sidebarCollapsed } = useThemeStore();
  const isDashboardView = matchPath('/dashboards/:id', location.pathname);
  const isSqlLab = matchPath('/sqllab', location.pathname);
  const isChartBuilder = matchPath('/charts/:id', location.pathname) || matchPath('/charts/builder', location.pathname) || matchPath('/charts/playground', location.pathname);

  const isSemanticLayer = matchPath('/data/semantic', location.pathname);
  const isDataflow = matchPath('/data/dataflow', location.pathname);
  const isChartListPage = matchPath('/charts', location.pathname);
  const isDatamartExplorer = matchPath('/self-service/:id', location.pathname);

  const isNoSidebarView = isDashboardView || isSqlLab || isChartBuilder || matchPath('/ai', location.pathname) || isSemanticLayer || isDataflow || isChartListPage || isDatamartExplorer;
  const isFullWidthView = isNoSidebarView;

  const { data: lobs, isLoading } = useQuery({
    queryKey: ['lobs'],
    queryFn: async () => {
      const response = await api.get('/api/lob/');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (lobs && lobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-center px-4">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Access Denied</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          You currently don't have access to any Lines of Business (LOB). Please contact your system administrator to request access.
        </p>
        <button 
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="px-6 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <CommandPalette />
      {!isNoSidebarView && <Sidebar />}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isFullWidthView ? 'h-screen overflow-hidden' : 'min-h-screen'} ${isNoSidebarView ? 'ml-0' : (sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64')}`}>
        <TopNav />
        <main className={`flex-1 flex flex-col min-h-0 min-w-0 custom-scrollbar ${isFullWidthView ? 'overflow-hidden' : 'overflow-y-auto p-8'}`}>
          <div className={`flex-1 min-h-0 min-w-0 flex flex-col ${isFullWidthView ? 'w-full h-full' : 'max-w-[1500px] mx-auto h-full w-full'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
