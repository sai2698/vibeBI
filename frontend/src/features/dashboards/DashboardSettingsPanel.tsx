import React, { useState } from 'react';
import { X, Settings2, Palette, Image as ImageIcon, Type, Layout, Save, Shield, ChevronDown, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { ECHARTS_THEMES } from '../../components/charts/themes';

interface DashboardSettings {
  id?: number;
  title: string;
  description: string;
  background_color: string;
  text_color: string;
  description_color: string;
  icon_color?: string;
  title_font_size?: number;
  subtitle_font_size?: number;
  logo_size?: string;
  logo_url: string;
  grid_gap: number;
  grid_cols: number;
  row_height: number;
  role_ids: number[];
  co_owner_ids?: string[];
  filter_config: any[];
  echarts_theme?: string;
  llm_config?: {
    base_url?: string;
    api_key?: string;
    model_name?: string;
    system_prompt?: string;
    headers?: Record<string, string>;
  };
  cache_config?: {
    enable_chart_cache?: boolean;
    chart_ttl?: number;
    enable_filter_cache?: boolean;
    filter_ttl?: number;
  };
}

interface DashboardSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashboardSettings;
  onSave: (settings: Partial<DashboardSettings>) => void;
  onChange?: (settings: Partial<DashboardSettings>) => void;
}

const DashboardSettingsPanel: React.FC<DashboardSettingsPanelProps> = ({ isOpen, onClose, settings, onSave, onChange }) => {
  const [localSettings, setLocalSettings] = useState<DashboardSettings>(settings);
  const [expandedSection, setExpandedSection] = useState<string>('general');

  const MultiSelectDropdown = ({ options, selectedIds, onChange, placeholder }: any) => {
    const [open, setOpen] = useState(false);
    const toggle = (id: any) => {
      if (selectedIds?.includes(id)) {
        onChange(selectedIds.filter((x: any) => x !== id));
      } else {
        onChange([...(selectedIds || []), id]);
      }
    };
    return (
      <div className="relative">
        <div
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 cursor-pointer flex justify-between items-center relative z-10"
          onClick={() => setOpen(!open)}
        >
          <div className="truncate pr-2 text-slate-500">
            {selectedIds?.length > 0 ? `${selectedIds.length} selected` : placeholder}
          </div>
        </div>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
              {options?.map((opt: any) => (
                <label key={opt.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                  <input type="checkbox" className="rounded text-brand" checked={selectedIds?.includes(opt.id)} onChange={() => toggle(opt.id)} />
                  <span className="text-xs text-slate-700 dark:text-slate-200">{opt.label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen]);

  const { data: availableRoles } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/api/roles/');
      return response.data;
    },
    enabled: isOpen
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/api/users/');
      return response.data;
    },
    enabled: isOpen
  });

  const { data: dbThemes } = useQuery<any[]>({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await api.get('/api/themes/');
      return response.data;
    },
    enabled: isOpen
  });

  const mergedThemes = React.useMemo(() => {
    const custom = (dbThemes || []).map((t: any) => {
      const themeObj = t.config?.theme || t.config;
      const colors = Array.isArray(themeObj?.color) ? themeObj.color : ['#6366F1', '#8B5CF6'];
      const id = t.name.toLowerCase().replace(/\s+/g, '_');
      return {
        id,
        name: `${t.name} (Custom)`,
        colors,
      };
    });
    return [...ECHARTS_THEMES, ...custom];
  }, [dbThemes]);

  const toggleRole = (roleId: number) => {
    const currentRoles = localSettings.role_ids || [];
    if (currentRoles.includes(roleId)) {
      handleChange('role_ids', currentRoles.filter(id => id !== roleId));
    } else {
      handleChange('role_ids', [...currentRoles, roleId]);
    }
  };

  if (!isOpen) return null;

  const handleChange = (key: keyof DashboardSettings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    if (onChange) onChange(updated);
  };

  const handleLlmChange = (key: keyof NonNullable<DashboardSettings['llm_config']>, value: any) => {
    const updatedConfig = { ...(localSettings.llm_config || {}), [key]: value };
    handleChange('llm_config', updatedConfig);
  };

  const handleCacheChange = (key: keyof NonNullable<DashboardSettings['cache_config']>, value: any) => {
    const updatedConfig = { ...(localSettings.cache_config || {}), [key]: value };
    handleChange('cache_config', updatedConfig);
  };

  const handleClearCache = async () => {
    if (!settings.id) return;
    try {
      await api.post(`/api/dashboards/${settings.id}/clear-cache`);
      alert('Dashboard cache cleared successfully.');
    } catch (e) {
      console.error('Failed to clear cache', e);
      alert('Failed to clear dashboard cache.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
  };

  const ColorField = ({ label, field }: { label: string; field: keyof DashboardSettings }) => (
    <div>
      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={localSettings[field] as string} onChange={e => handleChange(field, e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-100 dark:border-slate-700 p-0 overflow-hidden" />
        <input type="text" value={localSettings[field] as string} onChange={e => handleChange(field, e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <Settings2 size={20} className="text-brand" />
          <span className="font-bold text-sm uppercase tracking-wider">Dashboard Settings</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* General Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all relative ${expandedSection === 'general' ? 'z-30' : 'z-10'}`}>
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'general' ? '' : 'general')}
            className={`w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:bg-slate-100/50 transition-colors ${expandedSection === 'general' ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              <Type size={14} className="text-slate-400" /> General Info
            </div>
            {expandedSection === 'general' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>
          {expandedSection === 'general' && (
            <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Dashboard Title</label>
                <input type="text" value={localSettings.title} onChange={e => handleChange('title', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Description</label>
                <textarea value={localSettings.description} onChange={e => handleChange('description', e.target.value)} rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none resize-none" />
              </div>
            </div>
          )}
        </div>

        {/* Visuals Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all relative ${expandedSection === 'visuals' ? 'z-30' : 'z-10'}`}>
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'visuals' ? '' : 'visuals')}
            className={`w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:bg-slate-100/50 transition-colors ${expandedSection === 'visuals' ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              <Palette size={14} className="text-slate-400" /> Styling & Branding
            </div>
            {expandedSection === 'visuals' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>
          {expandedSection === 'visuals' && (
            <div className="p-4 space-y-5 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
              <ColorField label="Header Background" field="background_color" />
              <ColorField label="Title Text Color" field="text_color" />
              <ColorField label="Description Text Color" field="description_color" />
              <ColorField label="Header Icons Color" field="icon_color" />

              {/* ECharts Theme Select Dropdown */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Chart Visualization Theme</label>
                <select
                  value={localSettings.echarts_theme || 'default'}
                  onChange={e => handleChange('echarts_theme', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer"
                >
                  {mergedThemes.map(theme => (
                    <option key={theme.id} value={theme.id} className="dark:bg-slate-900">
                      {theme.name}
                    </option>
                  ))}
                </select>

                {/* Theme Color Preview dots */}
                <div className="flex gap-1 mt-2 p-1.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 overflow-x-auto">
                  {(mergedThemes.find(t => t.id === (localSettings.echarts_theme || 'default'))?.colors || []).slice(0, 8).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Logo URL</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden">
                    {localSettings.logo_url ? (
                      <img src={localSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon size={16} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <input type="text" value={localSettings.logo_url} placeholder="https://example.com/logo.png"
                    onChange={e => handleChange('logo_url', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              {/* Title Font Size slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Title Font Size</label>
                  <span className="text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{localSettings.title_font_size || 15}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="32"
                  step="1"
                  value={localSettings.title_font_size || 15}
                  onChange={(e) => handleChange('title_font_size', parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>

              {/* Subtitle Font Size slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Subtitle Font Size</label>
                  <span className="text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{localSettings.subtitle_font_size || 10}px</span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="24"
                  step="1"
                  value={localSettings.subtitle_font_size || 10}
                  onChange={(e) => handleChange('subtitle_font_size', parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>

              {/* Logo Size Toggle */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Logo Size (QlikSense style)</label>
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleChange('logo_size', size)}
                      className={`flex-1 text-center py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${(localSettings.logo_size || 'medium') === size
                          ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Layout Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all relative ${expandedSection === 'layout' ? 'z-30' : 'z-10'}`}>
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'layout' ? '' : 'layout')}
            className={`w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:bg-slate-100/50 transition-colors ${expandedSection === 'layout' ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              <Layout size={14} className="text-slate-400" /> Layout & Grid
            </div>
            {expandedSection === 'layout' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>
          {expandedSection === 'layout' && (
            <div className="p-4 space-y-5 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tile Spacing (Gap)</label>
                  <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{localSettings.grid_gap}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="4"
                  value={localSettings.grid_gap}
                  onChange={(e) => handleChange('grid_gap', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Grid Columns</label>
                  <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{localSettings.grid_cols} cols</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="24"
                  step="2"
                  value={localSettings.grid_cols}
                  onChange={(e) => handleChange('grid_cols', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Row Height</label>
                  <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{localSettings.row_height}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={localSettings.row_height}
                  onChange={(e) => handleChange('row_height', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>
            </div>
          )}
        </div>

        {/* Access Control Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all relative ${expandedSection === 'access' ? 'z-30' : 'z-10'}`}>
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'access' ? '' : 'access')}
            className={`w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:bg-slate-100/50 transition-colors ${expandedSection === 'access' ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              <Shield size={14} className="text-slate-400" /> Permissions & Access
            </div>
            {expandedSection === 'access' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>
          {expandedSection === 'access' && (
            <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed italic">
                If no roles are selected, this dashboard will be visible to all members of this LOB.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Visible to Roles</label>
                  <MultiSelectDropdown
                    options={availableRoles?.map(r => ({ id: r.id, label: r.name })) || []}
                    selectedIds={localSettings.role_ids}
                    onChange={(ids: any) => handleChange('role_ids', ids)}
                    placeholder="Select roles..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Co-Owners</label>
                  <MultiSelectDropdown
                    options={users?.map(u => ({ id: u.id, label: u.full_name || u.email })) || []}
                    selectedIds={localSettings.co_owner_ids || []}
                    onChange={(ids: any) => handleChange('co_owner_ids', ids)}
                    placeholder="Select users..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all relative ${expandedSection === 'ai' ? 'z-30' : 'z-10'}`}>
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'ai' ? '' : 'ai')}
            className={`w-full px-4 py-3 bg-brand/5 dark:bg-brand/10 flex items-center justify-between hover:bg-brand/10 transition-colors ${expandedSection === 'ai' ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-brand uppercase tracking-widest">
              <Shield size={14} /> AI Assistant Settings
            </div>
            {expandedSection === 'ai' ? <ChevronDown size={14} className="text-brand" /> : <ChevronRight size={14} className="text-brand" />}
          </button>
          {expandedSection === 'ai' && (
            <div className="p-4 space-y-4 border-t border-brand/10 animate-in slide-in-from-top-2 fade-in duration-200">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed italic">
                Override the default AI Assistant configuration specifically for this dashboard.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">LLM Base URL</label>
                <input type="text" value={localSettings.llm_config?.base_url || ''} onChange={e => handleLlmChange('base_url', e.target.value)}
                  placeholder="e.g. https://api.openai.com/v1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 transition-all outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">API Key</label>
                <input type="password" value={localSettings.llm_config?.api_key || ''} onChange={e => handleLlmChange('api_key', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 transition-all outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Model Name</label>
                <input type="text" value={localSettings.llm_config?.model_name || ''} onChange={e => handleLlmChange('model_name', e.target.value)}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 transition-all outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">System Prompt Override</label>
                <textarea value={localSettings.llm_config?.system_prompt || ''} onChange={e => handleLlmChange('system_prompt', e.target.value)} rows={4}
                  placeholder="You are an expert Data Analyst..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 transition-all outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">Custom Headers (JSON)</label>
                <textarea
                  value={typeof localSettings.llm_config?.headers === 'object' ? JSON.stringify(localSettings.llm_config.headers, null, 2) : (localSettings.llm_config?.headers || '')}
                  onChange={e => {
                    let val: any = e.target.value;
                    try { val = JSON.parse(val); } catch (err) { /* Allow raw string while typing */ }
                    handleLlmChange('headers', val);
                  }}
                  rows={3}
                  placeholder='{"Authorization": "Bearer ...", "x-custom-header": "value"}'
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand/20 transition-all outline-none resize-none" />
              </div>
            </div>
          )}
        </div>
        {/* Cache Settings Card */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all relative ${expandedSection === 'cache' ? 'z-30' : 'z-10'}`}>
          <button 
            type="button" 
            onClick={() => setExpandedSection(expandedSection === 'cache' ? '' : 'cache')}
            className={`w-full px-4 py-3 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between hover:bg-amber-500/10 transition-colors ${expandedSection === 'cache' ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
              <Zap size={14} /> Cache Settings
            </div>
            {expandedSection === 'cache' ? <ChevronDown size={14} className="text-amber-600 dark:text-amber-500" /> : <ChevronRight size={14} className="text-amber-600 dark:text-amber-500" />}
          </button>
          {expandedSection === 'cache' && (
            <div className="p-4 space-y-5 border-t border-amber-500/10 animate-in slide-in-from-top-2 fade-in duration-200">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed italic">
                Improve dashboard performance by enabling server-side caching for charts and filters.
              </p>
              
              {/* Chart Cache */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Enable Chart Data Cache</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={localSettings.cache_config?.enable_chart_cache || false} onChange={e => handleCacheChange('enable_chart_cache', e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {localSettings.cache_config?.enable_chart_cache && (
                  <div className="pl-2 border-l-2 border-amber-500/20">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Chart TTL (Seconds)</label>
                    <input type="number" min="1" value={localSettings.cache_config?.chart_ttl || 3600} onChange={e => handleCacheChange('chart_ttl', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                  </div>
                )}
              </div>

              {/* Filter Cache */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Enable Filter Values Cache</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={localSettings.cache_config?.enable_filter_cache || false} onChange={e => handleCacheChange('enable_filter_cache', e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {localSettings.cache_config?.enable_filter_cache && (
                  <div className="pl-2 border-l-2 border-amber-500/20">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Filter TTL (Seconds)</label>
                    <input type="number" min="1" value={localSettings.cache_config?.filter_ttl || 3600} onChange={e => handleCacheChange('filter_ttl', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                  </div>
                )}
              </div>

              {/* Clear Cache Button */}
              {settings.id && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors"
                  >
                    <RefreshCw size={14} /> Force Clear Dashboard Cache
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all transform active:scale-95"
        >
          <Save size={18} /> Apply Changes
        </button>
      </div>
    </div>
  );
};

export default DashboardSettingsPanel;
