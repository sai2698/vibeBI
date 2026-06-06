import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, HelpCircle, FileCode, Palette } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import { registerThemeOnTheFly, ECHARTS_THEMES } from '../../components/charts/themes';

interface DbTheme {
  id: number;
  name: string;
  config: any;
}

const ThemePickerPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Custom uploaded theme state
  const [file, setFile] = useState<File | null>(null);
  const [themeName, setThemeName] = useState('');
  const [themeConfig, setThemeConfig] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch custom uploaded themes from backend
  const { data: dbThemes, isLoading: isThemesLoading } = useQuery<DbTheme[]>({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await api.get('/api/themes/');
      // Register custom themes dynamically as we load them so they are immediately available
      response.data.forEach((theme: DbTheme) => {
        registerThemeOnTheFly(theme.name, theme.config);
      });
      return response.data;
    }
  });

  // Save new theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async (newTheme: { name: string; config: any }) => {
      return api.post('/api/themes/', newTheme);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Custom ECharts JS theme uploaded successfully!');
      // Register theme instantly
      registerThemeOnTheFly(response.data.name, response.data.config);
      // Reset upload states
      setFile(null);
      setThemeName('');
      setThemeConfig(null);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to save theme';
      toast.error(msg);
    }
  });

  // Delete theme mutation
  const deleteThemeMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/api/themes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Custom theme deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete custom theme');
    }
  });

  // Intercepting JS parser for ECharts theme files
  const parseJsThemeFile = (jsCode: string): { name: string; config: any } | null => {
    let capturedName = '';
    let capturedConfig: any = null;

    // Save previous window configurations to restore them later
    const oldEcharts = (window as any).echarts;
    const oldDefine = (window as any).define;
    const oldExports = (window as any).exports;
    const oldRequire = (window as any).require;

    try {
      // Setup interceptor on a temporary global echarts
      const mockEcharts = {
        registerTheme: (name: string, config: any) => {
          capturedName = name;
          capturedConfig = config;
        }
      };

      (window as any).echarts = mockEcharts;
      (window as any).define = undefined;
      (window as any).exports = undefined;
      (window as any).require = undefined;

      // Execute code with 'window' as 'this' context
      const runner = new Function(jsCode);
      runner.call(window);
    } catch (err) {
      console.error('Error executing ECharts JS theme parser:', err);
    } finally {
      // Restore previous global states
      if (oldEcharts !== undefined) (window as any).echarts = oldEcharts;
      else delete (window as any).echarts;
      
      if (oldDefine !== undefined) (window as any).define = oldDefine;
      else delete (window as any).define;
      
      if (oldExports !== undefined) (window as any).exports = oldExports;
      else delete (window as any).exports;
      
      if (oldRequire !== undefined) (window as any).require = oldRequire;
      else delete (window as any).require;
    }

    if (capturedConfig) {
      return { name: capturedName, config: capturedConfig };
    }
    return null;
  };

  // Handle JS File selection and parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.js')) {
      toast.error('Please upload a valid .js ECharts theme file.');
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const codeText = event.target?.result as string;
      const parsed = parseJsThemeFile(codeText);
      
      if (parsed) {
        // Auto capitalize and format theme name
        const display_name = parsed.name
          ? parsed.name.charAt(0).toUpperCase() + parsed.name.slice(1)
          : selectedFile.name.replace('.js', '');
        
        setThemeName(display_name);
        setThemeConfig(parsed.config);
        toast.success(`Successfully parsed ECharts theme: ${display_name}`);
      } else {
        toast.error('Could not extract theme definition from this JS file. Ensure it is a valid ECharts Theme file.');
        setFile(null);
        setThemeName('');
        setThemeConfig(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeName.trim()) {
      toast.error('Please enter a theme name.');
      return;
    }
    if (!themeConfig) {
      toast.error('Theme configuration is empty.');
      return;
    }

    saveThemeMutation.mutate({
      name: themeName,
      config: themeConfig
    });
  };

  // Helper to extract colors array from dynamic config
  const getThemeColors = (config: any): string[] => {
    const themeObj = config?.theme || config;
    if (themeObj && Array.isArray(themeObj.color)) {
      return themeObj.color;
    }
    return ['#e2e8f0', '#cbd5e1', '#94a3b8']; // Fallback placeholder
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      
      {/* Page Title Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
          <Palette size={32} className="text-brand animate-pulse" /> Platform Themes & Styling
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">Configure global platform aesthetics and customize interactive ECharts visualizations.</p>
      </div>

      {/* ── ECHARTS VISUAL THEMES & JS UPLOADER ── */}
      <section className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Theme Uploader Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Upload size={16} className="text-brand" /> Upload Theme JS
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold mt-1">
                Select your customized `.js` file downloaded directly from the{' '}
                <a 
                  href="https://echarts.apache.org/en/download-theme.html" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-brand hover:underline font-bold"
                >
                  ECharts Theme Downloader
                </a>.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag/Drop Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  file ? 'border-brand/50 bg-brand/5 dark:bg-brand/10' : 'border-slate-200 dark:border-slate-800 hover:border-brand/40 bg-slate-50 dark:bg-slate-950/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".js" 
                  className="hidden" 
                />
                
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className={`p-2.5 rounded-full ${file ? 'bg-brand/10 text-brand' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-sm'}`}>
                    <FileCode size={18} />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Select JS Theme File</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Drag & drop .js files here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Theme Name input */}
              {file && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Theme Display Name</label>
                  <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="e.g. Vintage Retro"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand/10 transition-all dark:text-slate-100"
                    required
                  />
                </div>
              )}

              {/* Real-time Theme Color preview inside uploader */}
              {themeConfig && (
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Colors Detected</span>
                  <div className="flex flex-wrap gap-1.5">
                    {getThemeColors(themeConfig).slice(0, 10).map((color, index) => (
                      <div
                        key={index}
                        className="w-5 h-5 rounded-full border border-white dark:border-slate-800 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || saveThemeMutation.isPending}
                className="w-full py-2.5 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand/15 hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
              >
                {saveThemeMutation.isPending ? 'Registering...' : 'Register Theme'}
              </button>
            </form>
          </div>

          {/* Themes Grid */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-slate-700 dark:text-slate-400 text-xs uppercase tracking-widest">Active Themes Catalog</h3>

            {isThemesLoading ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-semibold italic">Loading themes catalog...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Built-In standard themes */}
                {ECHARTS_THEMES.map((theme) => (
                  <div key={theme.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{theme.name}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">System</span>
                      </div>
                      <div className="flex gap-1.5 mt-2.5">
                        {theme.colors.slice(0, 8).map((col, i) => (
                          <div key={i} className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-sm" style={{ backgroundColor: col }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Custom-uploaded themes from Database */}
                {dbThemes?.map((theme) => {
                  const colors = getThemeColors(theme.config);
                  return (
                    <div key={theme.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-brand/25 transition-all">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{theme.name}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 animate-pulse">Custom</span>
                        </div>
                        <div className="flex gap-1.5 mt-2.5">
                          {colors.slice(0, 8).map((col, i) => (
                            <div key={i} className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-sm" style={{ backgroundColor: col }} />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteThemeMutation.mutate(theme.id)}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete dynamic theme"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                {(!dbThemes || dbThemes.length === 0) && (
                  <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-center col-span-2 bg-slate-50/30 dark:bg-slate-900/30">
                    <div className="text-slate-400 dark:text-slate-500">
                      <HelpCircle size={32} className="mx-auto mb-2.5 opacity-40" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No Custom Themes Uploaded Yet</p>
                      <p className="text-[10px] text-slate-400/80 dark:text-slate-500/80 mt-1 font-medium">Use the left panel to register your first dynamic theme configuration file!</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

    </div>
  );
};

export default ThemePickerPage;
