import React, { useState, useCallback, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  Play, Save,
  Loader2, X,
  SaveAll, Zap, Folder, HelpCircle, Code2, Database, LayoutTemplate, Braces
} from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useLOBStore } from '../../store/useLOBStore';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import SaveAssetModal from './components/SaveAssetModal';

const DEFAULT_CODE = `// Define the ECharts option object
option = {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: [
    {
      type: 'category',
      data: data.categories || [],
      axisTick: { alignWithLabel: true }
    }
  ],
  yAxis: [
    { type: 'value' }
  ],
  series: (data.series || []).map((s, index) => ({
    name: s.name,
    type: 'bar',
    barWidth: '60%',
    data: s.data,
    itemStyle: {
      color: index === 0 ? '#6366f1' : '#10B981',
      borderRadius: [4, 4, 0, 0]
    }
  }))
};`;

const DEFAULT_MOCK_DATA = `{
  "categories": ["Category A", "Category B", "Category C", "Category D", "Category E"],
  "series": [
    {
      "name": "Revenue",
      "data": [120, 200, 150, 80, 70]
    },
    {
      "name": "Profit",
      "data": [90, 150, 110, 60, 50]
    }
  ],
  "dimensions": [
    { "name": "Category", "data": ["Category A", "Category B", "Category C", "Category D", "Category E"] }
  ]
}`;

const CodePlaygroundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const chartId = queryParams.get('id');

  const { mode } = useThemeStore();
  const { activeLOB } = useLOBStore();
  const globalDarkMode = mode === 'dark';

  const [activeTab, setActiveTab] = useState<'code' | 'data'>('code');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mockData, setMockData] = useState(DEFAULT_MOCK_DATA);
  const [chartOption, setChartOption] = useState<any>({ backgroundColor: 'transparent' });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ type: 'log' | 'error' | 'warn'; msg: string }[]>([]);
  const [chartKey, setChartKey] = useState(0);

  // Save State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [saveTitle, setSaveTitle] = useState('New Custom Chart');
  const [saveFolderId, setSaveFolderId] = useState<number | null>(null);

  const echartsRef = useRef<any>(null);
  const chartInstanceRef = useRef<any>(null);
  const intervalsRef = useRef<any[]>([]);
  const timeoutsRef = useRef<any[]>([]);
  const eventQueueRef = useRef<{ type: string; handler: Function }[]>([]);

  const clearSandboxEffects = useCallback(() => {
    intervalsRef.current.forEach(id => window.clearInterval(id));
    timeoutsRef.current.forEach(id => window.clearTimeout(id));
    intervalsRef.current = [];
    timeoutsRef.current = [];
    eventQueueRef.current = [];
    chartInstanceRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearSandboxEffects();
    };
  }, [clearSandboxEffects]);

  useEffect(() => {
    // Re-render chart if global theme changes
    setChartKey(prev => prev + 1);
  }, [globalDarkMode]);

  const onChartReady = (instance: any) => {
    chartInstanceRef.current = instance;
    eventQueueRef.current.forEach(({ type, handler }) => {
      instance.on(type, handler);
    });
    eventQueueRef.current = [];
  };

  const runCode = useCallback(async (initialCode?: string) => {
    const codeToRun = initialCode || code;
    setIsRunning(true);
    setError(null);
    setLogs([]);
    setChartKey(prev => prev + 1);
    clearSandboxEffects();

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      setLogs(prev => [...prev.slice(-19), { type: 'error', msg: args.join(' ') }]);
      originalError(...args);
    };
    console.warn = (...args) => {
      setLogs(prev => [...prev.slice(-19), { type: 'warn', msg: args.join(' ') }]);
      originalWarn(...args);
    };

    try {
      const ROOT_PATH = 'https://echarts.apache.org/examples';

      const $ = {
        get: (url: string, cb: Function) => {
          const fullUrl = url.startsWith('http') ? url : `${ROOT_PATH}${url}`;
          const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
          fetch(proxiedUrl)
            .then(res => res.json())
            .then(data => { try { cb(data); } catch (err: any) { console.error('Callback Error:', err.message); } })
            .catch(err => console.error('Fetch Error:', err.message));
        }
      };

      const mockSetTimeout = (fn: Function, delay: number) => {
        const id = setTimeout(fn, delay);
        timeoutsRef.current.push(id);
        return id;
      };
      const mockSetInterval = (fn: Function, delay: number) => {
        const id = setInterval(fn, delay);
        intervalsRef.current.push(id);
        return id;
      };

      const myChartProxy = {
        setOption: (newOpt: any, opts?: any) => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.setOption(newOpt, opts);
          } else {
            setChartOption(newOpt);
          }
          setIsRunning(false);
        },
        getWidth: () => chartInstanceRef.current?.getWidth() || 800,
        getHeight: () => chartInstanceRef.current?.getHeight() || 600,
        getDom: () => chartInstanceRef.current?.getDom() || document.createElement('div'),
        on: (type: string, handler: Function) => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.on(type, handler);
          } else {
            eventQueueRef.current.push({ type, handler });
          }
        },
        off: (type: string, handler: Function) => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.off(type, handler);
          }
        },
        resize: () => chartInstanceRef.current?.resize(),
        dispatchAction: (payload: any) => chartInstanceRef.current?.dispatchAction(payload),
      };

      const wrappedCode = `
        var option; 
        try {
          ${codeToRun}
          if (typeof option !== 'undefined') return option;
        } catch (e) {
          throw e;
        }
      `;

      let parsedData = {};
      try {
        parsedData = JSON.parse(mockData);
      } catch (err) {
        console.warn('Invalid Mock Data JSON. Proceeding with empty data object.');
      }

      // Parity with EChartWrapper context: myChart, echarts, data, visualConfig, $
      const executionFunc = new Function('myChart', 'echarts', 'data', 'visualConfig', '$', 'ROOT_PATH', 'setTimeout', 'setInterval', wrappedCode);

      setTimeout(() => {
        try {
          const executionResult = executionFunc(myChartProxy, echarts, parsedData, { code: codeToRun }, $, ROOT_PATH, mockSetTimeout, mockSetInterval);
          if (executionResult && typeof executionResult === 'object') {
            setChartOption(executionResult);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsRunning(false);
        }
      }, 100);

    } catch (err: any) {
      setError(err.message || 'Failed to execute code');
      setIsRunning(false);
    } finally {
      setTimeout(() => {
        console.error = originalError;
        console.warn = originalWarn;
      }, 1000);
    }
  }, [code, mockData, clearSandboxEffects]);

  // Fetch existing chart if ID is provided
  const { data: existingChartData } = useQuery({
    queryKey: ['charts', chartId],
    queryFn: async () => {
      const response = await api.get(`/api/charts/${chartId}`);
      return response.data;
    },
    enabled: !!chartId,
  });

  useEffect(() => {
    if (existingChartData?.visual_config?.code) {
      setCode(existingChartData.visual_config.code);
      setSaveTitle(existingChartData.title);
      setSaveFolderId(existingChartData.folder_id || null);
      runCode(existingChartData.visual_config.code);
    } else if (!chartId) {
      runCode();
    }
  }, [existingChartData, chartId]);

  const saveMutation = useMutation({
    mutationFn: (chartData: any) => chartId
      ? api.patch(`/api/charts/${chartId}`, chartData)
      : api.post('/api/charts/', chartData),
    onSuccess: () => {
      toast.success('Custom chart saved successfully!');
      setShowSaveModal(false);
      navigate('/charts');
    },
    onError: (err: any) => {
      const errorData = err.response?.data?.detail;
      const errorMsg = typeof errorData === 'string'
        ? errorData
        : Array.isArray(errorData)
          ? errorData.map(e => e.msg || JSON.stringify(e)).join(', ')
          : 'Failed to save chart';
      toast.error(errorMsg);
    }
  });

  const handleSave = (newTitle: string, newFolderId: number | null) => {
    if (!newTitle) return toast.error('Please enter a title');
    saveMutation.mutate({
      title: newTitle,
      chart_type: 'custom_template',
      dataset_id: null,
      folder_id: newFolderId,
      query_config: {},
      visual_config: { code },
      lob_id: activeLOB?.id
    });
    setSaveTitle(newTitle);
    setSaveFolderId(newFolderId);
    setShowSaveModal(false);
  };



  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0f] overflow-hidden animate-in fade-in duration-500 relative">
      {/* Header */}
      <header className="h-16 md:h-20 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-30 transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand/10 dark:bg-brand/20 rounded-xl text-brand">
            <Code2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3 leading-none">
              Code Playground
              <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded font-semibold tracking-wide border border-slate-200 dark:border-slate-700">Custom Asset</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-none">Advanced Visual Sandbox</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowHelp(true)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors" title="Documentation">
            <HelpCircle size={20} />
          </button>

          <button onClick={() => runCode()} disabled={isRunning} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50">
            {isRunning ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            <span>Run Preview</span>
          </button>

          <button
            onClick={() => {
              if (!activeLOB) {
                toast.error('Please select or create a Line of Business (LOB) first.');
                return;
              }
              setShowSaveModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            <Save size={16} />
            <span>{chartId ? 'Update Asset' : 'Save Asset'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Editor */}
        <div className="w-[45%] flex flex-col bg-white dark:bg-[#0f1115] border-r border-slate-200 dark:border-slate-800 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[20px_0_40px_-15px_rgba(0,0,0,0.3)] z-20 transition-colors">
          <div className="flex items-center bg-[#f3f3f3] dark:bg-[#1a1b1e] border-b border-slate-200 dark:border-slate-800 shrink-0 px-2 pt-2">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all border-b-2 ${activeTab === 'code'
                  ? 'border-brand text-brand bg-white dark:bg-[#0f1115]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-[#0f1115]/50'
                }`}
            >
              <LayoutTemplate size={14} className={activeTab === 'code' ? 'text-brand' : 'opacity-50'} />
              Template JS
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all border-b-2 ${activeTab === 'data'
                  ? 'border-emerald-500 text-emerald-500 bg-white dark:bg-[#0f1115]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-[#0f1115]/50'
                }`}
            >
              <Braces size={14} className={activeTab === 'data' ? 'text-emerald-500' : 'opacity-50'} />
              Mock Data JSON
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <div className={`absolute inset-0 ${activeTab === 'code' ? 'block' : 'hidden'}`}>
              <CodeMirror
                value={code}
                height="100%"
                theme={globalDarkMode ? oneDark : 'light'}
                extensions={[javascript()]}
                onChange={(value) => setCode(value)}
                className="text-[13px] h-full"
              />
            </div>
            <div className={`absolute inset-0 ${activeTab === 'data' ? 'block' : 'hidden'}`}>
              <CodeMirror
                value={mockData}
                height="100%"
                theme={globalDarkMode ? oneDark : 'light'}
                extensions={[json()]}
                onChange={(value) => setMockData(value)}
                className="text-[13px] h-full"
              />
            </div>
          </div>

          {/* Console */}
          {(error || logs.length > 0) && (
            <div className="h-64 bg-[#1e1e1e] border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col font-mono text-[12px] shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-black/40 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Terminal</span>
                </div>
                <button onClick={() => setLogs([])} className="text-slate-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest px-2 py-1 hover:bg-white/10 rounded">Clear Log</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#1e1e1e]">
                {error && (
                  <div className="flex gap-3 text-red-400 mb-2 items-start">
                    <X size={14} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed whitespace-pre-wrap">{error}</span>
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-3 mb-1.5 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'}`}>
                    <span className="opacity-40 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span className="break-all whitespace-pre-wrap">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#0a0a0f] relative overflow-hidden transition-colors">
          <div className="h-10 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Code2 size={14} className="text-brand" />
              <span>Preview Panel</span>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden flex items-center justify-center relative z-10">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative transition-all duration-300 flex flex-col">
              <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 shrink-0">
                 <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{saveTitle || 'Untitled Widget'}</span>
              </div>
              <div className={`flex-1 p-6 transition-all duration-500 ${isRunning ? 'opacity-50 blur-[2px]' : 'opacity-100 blur-0'}`}>
                <ReactECharts
                  key={chartKey}
                  ref={echartsRef}
                  option={chartOption}
                  theme={globalDarkMode ? 'dark' : 'default'}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={false}
                  lazyUpdate={true}
                  onChartReady={onChartReady}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help/Documentation Sidebar */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 text-brand rounded-lg">
                  <HelpCircle size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Developer Documentation</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900">
              <section>
                <h3 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                  <Database size={16} className="text-brand" />
                  The 'data' Object Reference
                </h3>
                <p className="mb-4 text-xs">
                  When a template is applied in the Chart Builder, your script receives a dynamic <code>data</code> object.
                  You can simulate this data by using the <strong>Mock Data JSON</strong> tab. The builder passes data structured exactly like this:
                </p>
                <div className="bg-slate-900 dark:bg-black rounded-xl p-4 text-slate-300 font-mono text-[11px] overflow-hidden shadow-inner">
                  <pre>
                    {`{
  // First dimension (Rows) - Use this for X-Axis
  "categories": ["Category A", "Category B", ...], 
  
  // Measures (Values) - Use this for Series
  "series": [
    {
      "name": "Revenue",
      "data": [120, 200, ...]
    },
    {
      "name": "Profit",
      "data": [80, 150, ...]
    }
  ],
  
  // All dimensions (Rows + Columns)
  "dimensions": [
    { "name": "Category", "data": [...] }
  ]
}`}
                  </pre>
                </div>
              </section>

              <section>
                <h3 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                  <Code2 size={16} className="text-indigo-500" />
                  Sandbox Execution Context
                </h3>
                <p className="mb-4 text-xs">
                  Your script is executed securely with access to the following APIs:
                </p>
                <ul className="space-y-4 text-xs">
                  <li className="flex gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <code className="text-brand font-bold bg-brand/10 dark:bg-brand/20 px-2 py-0.5 rounded h-fit">myChart</code>
                    <span>The ECharts proxy. While you can call <code>myChart.setOption(option)</code>, you can simply declare an <code>option</code> object and it will be captured automatically.</span>
                  </li>
                  <li className="flex gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <code className="text-brand font-bold bg-brand/10 dark:bg-brand/20 px-2 py-0.5 rounded h-fit">echarts</code>
                    <span>The complete <code>apache-echarts</code> namespace. Perfect for <code>echarts.graphic.LinearGradient</code>, complex formatting, and utilities.</span>
                  </li>
                  <li className="flex gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <code className="text-brand font-bold bg-brand/10 dark:bg-brand/20 px-2 py-0.5 rounded h-fit">$</code>
                    <span>A lightweight jQuery proxy (<code>$.get(url, cb)</code>) for external dataset fetching during prototype development.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  Recipe: Dynamic Line Chart
                </h3>
                <div className="bg-slate-900 dark:bg-black rounded-xl p-4 text-slate-300 font-mono text-[11px] overflow-hidden shadow-inner">
                  <pre>
                    {`option = {
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: data.categories || []
  },
  yAxis: { type: 'value' },
  series: data.series.map(s => ({
    name: s.name,
    type: 'line',
    data: s.data,
    smooth: true,
    areaStyle: { opacity: 0.1 }
  }))
};`}
                  </pre>
                </div>
              </section>

              <section>
                <h3 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                  Recipe: Dynamic Pie Chart
                </h3>
                <div className="bg-slate-900 dark:bg-black rounded-xl p-4 text-slate-300 font-mono text-[11px] overflow-hidden shadow-inner">
                  <pre>
                    {`// Safely mapping data for a pie chart
const pieData = (data.categories || []).map((cat, i) => ({
  name: cat,
  value: data.series[0]?.data[i] || 0
}));

option = {
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    data: pieData,
    itemStyle: {
      borderRadius: 10,
      borderColor: '#fff',
      borderWidth: 2
    }
  }]
};`}
                  </pre>
                </div>
              </section>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-[11px]"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      <SaveAssetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        initialTitle={saveTitle}
        initialFolderId={saveFolderId}
        isSaving={saveMutation.isPending}
        isUpdating={!!chartId}
      />
    </div>
  );
};

export default CodePlaygroundPage;
