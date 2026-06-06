import React, { useState, useRef, useEffect } from 'react';
import { useLocation, matchPath, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import LOBSwitcher from '../lob/LOBSwitcher';
import { Search, Bell, Sun, Moon, Menu, ChevronLeft, LogOut, Shield } from 'lucide-react';

const TopNav: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { mode, toggleMode, sidebarCollapsed, toggleSidebar, toggleMobileSidebar } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isDashboardView = matchPath('/dashboards/:id', location.pathname);
  const isSqlLab = matchPath('/sqllab', location.pathname);
  const isChartBuilder = matchPath('/charts/:id', location.pathname) || matchPath('/charts/builder', location.pathname);
  const isSemanticLayer = matchPath('/data/semantic', location.pathname);
  const isDataflow = matchPath('/data/dataflow', location.pathname);
  const isChartListPage = matchPath('/charts', location.pathname);
  const isNoSidebarView = isDashboardView || isSqlLab || isChartBuilder || matchPath('/ai', location.pathname) || isSemanticLayer || matchPath('/charts/playground', location.pathname) || isDataflow || isChartListPage;
  
  let hubPath = '/dashboards';
  if (isChartBuilder || matchPath('/charts/playground', location.pathname)) hubPath = '/charts';
  if (isSqlLab) hubPath = '/dashboards';
  if (matchPath('/ai', location.pathname)) hubPath = '/dashboards';
  if (isSemanticLayer || isDataflow) hubPath = '/data/datasets';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-8 sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-6">
        {!isNoSidebarView && (
          <>
            <button
              onClick={toggleSidebar}
              className="hidden md:block p-2 -ml-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <Menu size={20} />
            </button>
            <button
              onClick={toggleMobileSidebar}
              className="md:hidden p-2 -ml-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Open Menu"
            >
              <Menu size={20} />
            </button>
          </>
        )}
        {isNoSidebarView && (
          <Link 
            to={hubPath} 
            className="flex items-center gap-1 -ml-4 pr-3 py-1.5 text-slate-400 hover:text-brand transition-colors group"
            title="Back to Hub"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm tracking-tight">Back</span>
          </Link>
        )}
        <LOBSwitcher />
        <div className="relative w-64 hidden md:block">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search dashboards..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMode}
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {mode === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative focus:outline-none"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Notifications</span>
                <button className="text-[10px] text-brand hover:text-brand-dark transition-colors font-semibold">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                <div className="p-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full">
                    <Bell size={24} className="opacity-40" />
                  </div>
                  <p className="text-xs font-semibold">No new notifications</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="h-8 w-8 rounded-full bg-brand-light text-brand font-semibold flex items-center justify-center hover:ring-2 hover:ring-brand/30 transition-all focus:outline-none ml-2"
          >
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-light text-brand font-bold flex items-center justify-center text-lg shrink-0 border border-brand/20">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.full_name || 'User'}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</span>
                </div>
              </div>
              
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="px-3 py-2 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield size={12} className="text-brand" />
                    Assigned Roles
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {user?.roles?.length ? (
                      user.roles.map((role, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No roles assigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-800/50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition-colors font-bold"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
