import React from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useThemeStore } from '../../store/useThemeStore';
import CommandPalette from '../ui/CommandPalette';

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

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <CommandPalette />
      {!isNoSidebarView && <Sidebar />}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isFullWidthView ? 'h-screen overflow-hidden' : 'min-h-screen'} ${isNoSidebarView ? 'ml-0' : (sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64')}`}>
        <TopNav />
        <main className={`flex-1 flex flex-col min-h-0 min-w-0 custom-scrollbar ${isFullWidthView ? 'overflow-hidden' : 'overflow-y-auto p-8'}`}>
          <div className={`flex-1 min-h-0 min-w-0 flex flex-col ${isFullWidthView ? 'w-full h-full' : 'max-w-7xl mx-auto h-full w-full'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
