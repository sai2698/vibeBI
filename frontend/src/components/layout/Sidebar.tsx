import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Shield, UserCog, LayoutDashboard, Database, Settings, LogOut, Terminal, BarChart3, Clock, Bot, Layers, Globe, Plus, Mail, Code2, Compass } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';

const Sidebar: React.FC = () => {
  const { logout, user } = useAuthStore();
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebar } = useThemeStore();
  
  const isAdmin = user?.roles?.includes('Admin') || user?.permissions?.includes('admin:all');
  const userPermissions = user?.permissions || [];

  const hasPermission = (perm: string) => isAdmin || userPermissions.includes(perm);

  const navItems = [
    { name: 'Self Service', path: '/self-service', icon: <Compass size={18} />, permission: 'menu:self_service' },
    { name: 'Dashboards', path: '/dashboards', icon: <LayoutDashboard size={18} />, permission: 'menu:dashboards' },
    { name: 'Charts', path: '/charts', icon: <BarChart3 size={18} />, permission: 'menu:chart_builder' },
    { name: 'Chart Builder', path: '/charts/builder', icon: <Plus size={18} />, permission: 'menu:chart_builder' },
    { name: 'Code Playground', path: '/charts/playground', icon: <Code2 size={18} />, permission: 'menu:chart_builder' },
    { name: 'SQL Lab', path: '/sqllab', icon: <Terminal size={18} />, permission: 'menu:sqllab' },
    { name: 'AI Workspace', path: '/ai', icon: <Bot size={18} />, permission: 'menu:sqllab' },
    { name: 'Datasources', path: '/data/datasources', icon: <Database size={18} />, permission: 'menu:data_management' },
    { name: 'Datasets', path: '/data/datasets', icon: <Database size={18} />, permission: 'menu:data_management' },
    { name: 'Semantic Layer', path: '/data/semantic', icon: <Layers size={18} />, permission: 'menu:data_management' },
    { name: 'Scheduler', path: '/scheduler', icon: <Clock size={18} />, permission: 'menu:scheduler' },
    { name: 'Mailer', path: '/mailer', icon: <Mail size={18} />, permission: 'menu:mailer' },
  ];

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));

  const adminItems = [
    { name: 'Users', path: '/admin/users', icon: <Users size={18} />, permission: 'admin:users' },
    { name: 'Groups', path: '/admin/groups', icon: <UserCog size={18} />, permission: 'admin:groups' },
    { name: 'Roles', path: '/admin/roles', icon: <Shield size={18} />, permission: 'admin:roles' },
    { name: 'Row Level Security', path: '/settings/rls', icon: <Shield size={18} />, permission: 'admin:rls' },
    { name: 'LOBs', path: '/admin/lob', icon: <Globe size={18} />, permission: 'admin:settings' },
    { name: 'Themes', path: '/admin/themes', icon: <Settings size={18} />, permission: 'admin:settings' },
    { name: 'LDAP', path: '/admin/ldap', icon: <Shield size={18} />, permission: 'admin:settings' },
    { name: 'Audit Logs', path: '/admin/audit', icon: <Shield size={18} />, permission: 'admin:all' },
  ];

  const filteredAdminItems = adminItems.filter(item => hasPermission(item.permission));

  const [hoveredTooltip, setHoveredTooltip] = React.useState<{ text: string; top: number } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, text: string) => {
    if (sidebarCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({ text, top: rect.top + rect.height / 2 });
    }
  };

  const handleMouseLeave = () => setHoveredTooltip(null);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <div className={`fixed left-0 top-0 h-full bg-white dark:bg-slate-900 flex flex-col shadow-lg z-50 border-r border-slate-200 dark:border-slate-800 transition-all duration-300
        ${mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
      {/* Brand Header */}
      <div className={`flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-6'} gap-3.5 py-6 transition-all duration-300`}>
        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-brand to-brand/80 flex items-center justify-center shadow-lg shadow-brand/20 border border-brand/20">
          <span className="text-white font-black tracking-tighter text-sm">BI</span>
        </div>
        <span className={`text-xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-24 opacity-100'}`}>
          Vibe BI
        </span>
      </div>

      <div className={`flex-1 overflow-y-auto py-2 custom-scrollbar ${sidebarCollapsed ? 'px-2' : 'px-3'} space-y-6 transition-all duration-300`}>
        
        {/* Main Navigation */}
        <nav className="space-y-1">
          <p className={`px-3 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>Platform</p>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileSidebar(false)}
              onMouseEnter={(e) => handleMouseEnter(e, item.name)}
              onMouseLeave={handleMouseLeave}
              className={({ isActive }) =>
                `group flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'} py-2 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? 'bg-brand/10 text-brand font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand rounded-r-full" />}
                  <span className={`${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity shrink-0 flex items-center justify-center ${sidebarCollapsed ? 'w-10' : 'w-5 mr-3'}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-40 opacity-100'}`}>
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Administration */}
        {filteredAdminItems.length > 0 && (
          <nav className="space-y-1">
            <p className={`px-3 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>Administration</p>
            {filteredAdminItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileSidebar(false)}
                onMouseEnter={(e) => handleMouseEnter(e, item.name)}
                onMouseLeave={handleMouseLeave}
                className={({ isActive }) =>
                  `group flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'} py-2 rounded-xl transition-all duration-200 relative ${
                    isActive
                      ? 'bg-brand/10 text-brand font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand rounded-r-full" />}
                    <span className={`${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity shrink-0 flex items-center justify-center ${sidebarCollapsed ? 'w-10' : 'w-5 mr-3'}`}>
                      {item.icon}
                    </span>
                    <span className={`text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-40 opacity-100'}`}>
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {/* Footer Area */}
      <div className={`p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 transition-all duration-300 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={logout}
          onMouseEnter={(e) => handleMouseEnter(e, 'Sign Out')}
          onMouseLeave={handleMouseLeave}
          className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors group`}
        >
          <span className={`shrink-0 flex items-center justify-center ${sidebarCollapsed ? 'w-10' : 'w-5 mr-3'}`}>
            <LogOut size={18} className="opacity-70 group-hover:opacity-100" />
          </span>
          <span className={`text-[13px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-40 opacity-100 text-left'}`}>
            Sign Out
          </span>
        </button>
      </div>

      {/* Dynamic Tooltip Portal */}
      {hoveredTooltip && (
        <div 
          className="fixed left-[76px] z-[100] px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[12px] font-semibold rounded-md shadow-lg pointer-events-none -translate-y-1/2 whitespace-nowrap border border-slate-200 dark:border-slate-700/50 animate-in fade-in slide-in-from-left-1 duration-200"
          style={{ top: hoveredTooltip.top }}
        >
          {hoveredTooltip.text}
        </div>
      )}
    </div>
    </>
  );
};

export default Sidebar;
