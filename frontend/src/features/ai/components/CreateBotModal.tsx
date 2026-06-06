import React, { useState } from 'react';
import { Sparkles, X, Settings, Globe, Database, Zap, Shield, Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { toast } from 'react-hot-toast';
import { useLOBStore } from '../../../store/useLOBStore';
import { ICON_MAP } from './types';
import type { AIBot } from './types';

const CreateBotModal: React.FC<{ onClose: () => void, editingBot: AIBot | null }> = ({ onClose, editingBot }) => {
    const queryClient = useQueryClient();
    const activeLOB = useLOBStore((state: any) => state.activeLOB);
    const [step, setStep] = useState<'general' | 'connectivity' | 'knowledge' | 'tools'>('general');
    const [formData, setFormData] = useState({
        name: editingBot?.name || '',
        description: editingBot?.description || '',
        bot_id: editingBot?.bot_id || '',
        tagline: editingBot?.avatar_config.tagline || 'Custom Assistant',
        icon: editingBot?.avatar_config.icon || 'Sparkles',
        color: editingBot?.avatar_config.color || 'bg-brand',
        base_url: editingBot?.llm_config.base_url || '',
        model_name: editingBot?.llm_config.model_name || '',
        api_key: editingBot?.llm_config.api_key || '',
        headers: editingBot?.llm_config.headers ? JSON.stringify(editingBot.llm_config.headers, null, 2) : '',
        system_prompt: editingBot?.llm_config.system_prompt || '',
        stream: editingBot?.llm_config.stream || false,
        dataset_ids: editingBot?.knowledge_config.dataset_ids || [] as number[],
        enable_sql_tool: editingBot?.tools_config?.enable_sql_tool || false,
        mcp_servers: editingBot?.tools_config?.mcp_servers || [] as { name: string; url: string; api_key?: string }[]
    });

    const [mcpName, setMcpName] = useState('');
    const [mcpUrl, setMcpUrl] = useState('');
    const [mcpKey, setMcpKey] = useState('');

    const { data: datasets } = useQuery({
        queryKey: ['datasets', activeLOB?.id],
        queryFn: async () => {
            const response = await api.get('/api/datasets', { params: { lob_id: activeLOB?.id } });
            return response.data;
        }
    });

    const createBotMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                name: data.name,
                description: data.description,
                bot_id: data.bot_id || data.name.toLowerCase().replace(/\s+/g, '-'),
                avatar_config: { icon: data.icon, color: data.color, tagline: data.tagline },
                llm_config: {
                    base_url: data.base_url,
                    model_name: data.model_name,
                    api_key: data.api_key,
                    system_prompt: data.system_prompt,
                    stream: data.stream,
                    headers: data.headers ? JSON.parse(data.headers) : {}
                },
                knowledge_config: { dataset_ids: data.dataset_ids },
                tools_config: {
                    enable_sql_tool: data.enable_sql_tool,
                    mcp_servers: data.mcp_servers
                },
                lob_id: activeLOB?.id
            };

            if (editingBot) {
                return api.patch(`/api/ai/bots/${editingBot.id}`, payload);
            }
            return api.post('/api/ai/bots', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-bots'] });
            toast.success(editingBot ? 'Assistant updated successfully' : 'Custom Bot created successfully');
            onClose();
        },
        onError: () => {
            toast.error('Failed to save bot. Check your configuration.');
        }
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border dark:border-slate-800">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${formData.color} text-white shadow-lg`}>
                            {ICON_MAP[formData.icon] || <Sparkles size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingBot ? 'Edit' : 'Configure'} AI Assistant</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Enterprise Bot Factory</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {[
                        { id: 'general', label: 'General', icon: <Settings size={14} /> },
                        { id: 'connectivity', label: 'Connectivity', icon: <Globe size={14} /> },
                        { id: 'knowledge', label: 'Knowledge', icon: <Database size={14} /> },
                        { id: 'tools', label: 'Agentic Tools', icon: <Zap size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setStep(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold transition-all border-b-2 ${step === t.id ? 'border-brand text-brand bg-white dark:bg-slate-950' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {step === 'general' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assistant Name</label>
                                    <input
                                        type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                        placeholder="e.g. Sales Oracle"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tagline</label>
                                    <input
                                        type="text" value={formData.tagline} onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                        placeholder="e.g. Revenue Predictor"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                                <textarea
                                    rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                    placeholder="Explain what this bot does..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Accent Color</label>
                                    <div className="flex gap-2">
                                        {['bg-brand', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-slate-900'].map(c => (
                                            <button
                                                key={c} onClick={() => setFormData({ ...formData, color: c })}
                                                className={`w-8 h-8 rounded-full ${c} border-2 transition-all ${formData.color === c ? 'border-slate-400 dark:border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Icon Selection</label>
                                    <div className="flex gap-2">
                                        {['Sparkles', 'Terminal', 'Brain', 'Zap', 'TrendingUp', 'Cpu'].map(i => (
                                            <button
                                                key={i} onClick={() => setFormData({ ...formData, icon: i })}
                                                className={`p-2 rounded-lg border transition-all ${formData.icon === i ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-brand' : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                            >
                                                {React.cloneElement(ICON_MAP[i] as any, { size: 18 })}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'connectivity' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">LLM Endpoint URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text" value={formData.base_url} onChange={e => setFormData({ ...formData, base_url: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                        placeholder="https://api.openai.com/v1"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model Name</label>
                                    <input
                                        type="text" value={formData.model_name} onChange={e => setFormData({ ...formData, model_name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                        placeholder="gpt-4o"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">API Key</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="password" value={formData.api_key} onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                            placeholder="sk-..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom Headers (JSON)</label>
                                <textarea
                                    rows={2} value={formData.headers} onChange={e => setFormData({ ...formData, headers: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                    placeholder='{ "X-Custom-Auth": "token" }'
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Prompt (Instructions)</label>
                                <textarea
                                    rows={4} value={formData.system_prompt} onChange={e => setFormData({ ...formData, system_prompt: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-slate-900 dark:text-slate-100"
                                    placeholder="You are a senior data analyst. Always respond with JSON-formatted insights..."
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <Zap size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Enable Streaming</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-time response generation</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, stream: !formData.stream })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.stream ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.stream ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}


                    {step === 'knowledge' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Knowledge Base (Grounding)</label>
                                <p className="text-xs text-slate-400 mb-4">Select datasets this assistant should understand when answering queries.</p>
                                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {datasets?.map((ds: any) => (
                                        <button
                                            key={ds.id}
                                            onClick={() => {
                                                const ids = formData.dataset_ids.includes(ds.id)
                                                    ? formData.dataset_ids.filter(id => id !== ds.id)
                                                    : [...formData.dataset_ids, ds.id];
                                                setFormData({ ...formData, dataset_ids: ids });
                                            }}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${formData.dataset_ids.includes(ds.id)
                                                ? 'bg-brand/5 dark:bg-brand/10 border-brand ring-1 ring-brand/20'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${formData.dataset_ids.includes(ds.id) ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                    <Database size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{ds.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{ds.datasource_name}</div>
                                                </div>
                                            </div>
                                            {formData.dataset_ids.includes(ds.id) && <Check size={16} className="text-brand" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'tools' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* NL2SQL Tool */}
                            <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-3xl flex items-start gap-4">
                                <div className="p-2.5 bg-blue-500 rounded-2xl text-white shadow-md shadow-blue-500/10 shrink-0">
                                    <Database size={18} />
                                </div>
                                <div className="flex-1 col-span-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Natural Language to SQL (NL2SQL)</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Allow the assistant to query and aggregate data securely across your selected datasets in real time.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, enable_sql_tool: !formData.enable_sql_tool })}
                                            className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${formData.enable_sql_tool ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.enable_sql_tool ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* MCP Servers */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Model Context Protocol (MCP) Servers</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Configure external tools via secure proxy endpoints</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5 text-left">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Server Name</label>
                                            <input
                                                type="text" value={mcpName} onChange={e => setMcpName(e.target.value)}
                                                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-brand/10 outline-none transition-all text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. Sales API Proxy"
                                            />
                                        </div>
                                        <div className="space-y-1.5 text-left">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Server URL</label>
                                            <input
                                                type="text" value={mcpUrl} onChange={e => setMcpUrl(e.target.value)}
                                                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-brand/10 outline-none transition-all text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. https://mcp.enterprise.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">API Key (Optional)</label>
                                        <input
                                            type="password" value={mcpKey} onChange={e => setMcpKey(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-brand/10 outline-none transition-all text-slate-900 dark:text-slate-100"
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!mcpName || !mcpUrl) {
                                                toast.error('Please fill in server name and URL');
                                                return;
                                            }
                                            const newServer = { name: mcpName, url: mcpUrl, api_key: mcpKey };
                                            setFormData({
                                                ...formData,
                                                mcp_servers: [...formData.mcp_servers, newServer]
                                            });
                                            setMcpName('');
                                            setMcpUrl('');
                                            setMcpKey('');
                                            toast.success('MCP server added');
                                        }}
                                        className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Plus size={14} /> Add MCP Server
                                    </button>
                                </div>

                                {/* Active MCP Servers List */}
                                {formData.mcp_servers.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1 text-left block">Configured Servers</label>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden">
                                            {formData.mcp_servers.map((srv, sIdx) => (
                                                <div key={sIdx} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors">
                                                    <div className="text-left">
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{srv.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate max-w-sm">{srv.url}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                mcp_servers: formData.mcp_servers.filter((_, i) => i !== sIdx)
                                                            });
                                                            toast.success('MCP server removed');
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {step === 'tools' ? 'Final Step' : `Step ${step === 'general' ? '1' : step === 'connectivity' ? '2' : '3'} of 4`}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (step === 'tools') setStep('knowledge');
                                else if (step === 'knowledge') setStep('connectivity');
                                else if (step === 'connectivity') setStep('general');
                                else onClose();
                            }}
                            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {step === 'general' ? 'Cancel' : 'Back'}
                        </button>
                        {step !== 'tools' ? (
                            <button
                                onClick={() => setStep(step === 'general' ? 'connectivity' : step === 'connectivity' ? 'knowledge' : 'tools')}
                                className="px-8 py-2.5 bg-slate-900 dark:bg-brand text-white rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-brand/90 transition-all shadow-lg shadow-slate-200 dark:shadow-brand/20"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                onClick={() => createBotMutation.mutate(formData)}
                                disabled={createBotMutation.isPending || !formData.name}
                                className="px-8 py-2.5 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
                            >
                                {createBotMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : (editingBot ? 'Update Assistant' : 'Create Assistant')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBotModal;
