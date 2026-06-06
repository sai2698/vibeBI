import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Sparkles, AlertCircle, TrendingUp, Lightbulb,
    Terminal, ChevronLeft, History, MessageSquare,
    User, Trash2, Cpu, Zap, Brain, Plus, Loader2,
    Globe, Shield, Database, Settings, X, Check, ChevronDown, Wrench
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useLOBStore } from '../../store/useLOBStore';
import api from '../../api';
import { toast } from 'react-hot-toast';

import { ICON_MAP } from './components/types';
import type { AIBot, Message, ChatSession } from './components/types';
import CreateBotModal from './components/CreateBotModal';
import AIChatSidebar from './components/AIChatSidebar';
import AIChatMessageList from './components/AIChatMessageList';
import AIStreamingBlock from './components/AIStreamingBlock';
import AIChatInput from './components/AIChatInput';

const AIWorkspacePage: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedBot, setSelectedBot] = useState<AIBot | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const activeLOB = useLOBStore((state: any) => state.activeLOB);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [editingBot, setEditingBot] = useState<AIBot | null>(null);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const [quickMcpName, setQuickMcpName] = useState('');
    const [quickMcpUrl, setQuickMcpUrl] = useState('');
    const [thinkingText, setThinkingText] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const [toolCalls, setToolCalls] = useState<{ index: number; name: string; id: string; args: string; done?: boolean }[]>([]);
    const [toolResults, setToolResults] = useState<{ tool_call_id: string; name: string; result: string }[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Smart Auto-scroll to bottom during streaming
    useEffect(() => {
        if (isStreaming && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom) {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [streamingMessage, thinkingText, toolCalls, toolResults, isStreaming]);

    const stopStreaming = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setStreamingMessage(null);
        setThinkingText(null);
        setIsThinking(false);
        setIsThinkingExpanded(false);
        setToolCalls([]);
        setToolResults([]);
    };

    const generateTitleMutation = useMutation({
        mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
            const response = await api.post(`/api/ai/sessions/${sessionId}/generate-title`, { message });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
        }
    });

    const toggleSqlToolMutation = useMutation({
        mutationFn: async ({ botId, enableSql }: { botId: any; enableSql: boolean }) => {
            const targetBot = bots?.find(b => String(b.id) === String(botId));
            if (!targetBot) return;
            const payload = {
                tools_config: {
                    ...targetBot.tools_config,
                    enable_sql_tool: enableSql
                }
            };
            return api.patch(`/api/ai/bots/${botId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-bots'] });
            toast.success('Agent tool updated successfully!');
        }
    });

    const addQuickMcpMutation = useMutation({
        mutationFn: async ({ botId, name, url }: { botId: any; name: string; url: string }) => {
            const targetBot = bots?.find(b => String(b.id) === String(botId));
            if (!targetBot) return;
            const currentMcp = targetBot.tools_config?.mcp_servers || [];
            const payload = {
                tools_config: {
                    ...targetBot.tools_config,
                    mcp_servers: [...currentMcp, { name, url }]
                }
            };
            return api.patch(`/api/ai/bots/${botId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-bots'] });
            setQuickMcpName('');
            setQuickMcpUrl('');
            toast.success('MCP server added successfully!');
        }
    });

    const removeQuickMcpMutation = useMutation({
        mutationFn: async ({ botId, index }: { botId: any; index: number }) => {
            const targetBot = bots?.find(b => String(b.id) === String(botId));
            if (!targetBot) return;
            const currentMcp = targetBot.tools_config?.mcp_servers || [];
            const payload = {
                tools_config: {
                    ...targetBot.tools_config,
                    mcp_servers: currentMcp.filter((_, i) => i !== index)
                }
            };
            return api.patch(`/api/ai/bots/${botId}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-bots'] });
            toast.success('MCP server removed successfully!');
        }
    });

    // Fetch all bots (system + custom)
    const { data: bots, isLoading: isLoadingBots } = useQuery<AIBot[]>({
        queryKey: ['ai-bots', activeLOB?.id],
        queryFn: async () => {
            const response = await api.get('/api/ai/bots', { params: { lob_id: activeLOB?.id } });
            return response.data;
        }
    });

    // Fetch all sessions
    const { data: sessions, isLoading: isLoadingSessions } = useQuery<ChatSession[]>({
        queryKey: ['ai-sessions'],
        queryFn: async () => {
            const response = await api.get('/api/ai/sessions');
            return response.data;
        }
    });

    // Fetch current session details
    const { data: currentSession, isLoading: isLoadingMessages } = useQuery<ChatSession>({
        queryKey: ['ai-sessions', currentSessionId],
        queryFn: async () => {
            const response = await api.get(`/api/ai/sessions/${currentSessionId}`);
            return response.data;
        },
        enabled: !!currentSessionId
    });

    // Create new session
    const createSessionMutation = useMutation({
        mutationFn: async (botId: string) => {
            const response = await api.post('/api/ai/sessions', {
                title: `Chat with ${bots?.find(b => b.bot_id === botId)?.name || 'Assistant'}`,
                bot_id: botId
            });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
            setCurrentSessionId(data.id);
            const bot = bots?.find(b => b.bot_id === data.bot_id);
            if (bot) setSelectedBot(bot);
        }
    });

    // Delete session
    const deleteSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            await api.delete(`/api/ai/sessions/${sessionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
            if (currentSessionId) setCurrentSessionId(null);
            toast.success('Session deleted');
        }
    });

    // Delete Bot
    const deleteBotMutation = useMutation({
        mutationFn: async (botId: string) => {
            await api.delete(`/api/ai/bots/${botId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-bots'] });
            toast.success('Assistant deleted');
        }
    });

    const handleBotSelect = (bot: AIBot) => {
        stopStreaming();
        setSelectedBot(bot);
        setCurrentSessionId(null);
    };

    const handleSend = async (userContent: string) => {
        if (!userContent.trim() || isStreaming) return;

        let sessionId = currentSessionId;
        let isNewSession = false;

        if (!sessionId && selectedBot) {
            try {
                const newSession = await createSessionMutation.mutateAsync(selectedBot.bot_id);
                sessionId = newSession.id;
                isNewSession = true;
                setCurrentSessionId(sessionId);
            } catch (error) {
                toast.error('Failed to start session');
                return;
            }
        }

        if (isNewSession && sessionId) {
            // Trigger title generation in the background
            generateTitleMutation.mutate({ sessionId, message: userContent });
        }

        if (sessionId) {
            setIsStreaming(true);
            setStreamingMessage('');
            setThinkingText(null);
            setIsThinking(false);
            setIsThinkingExpanded(false);
            setToolCalls([]);
            setToolResults([]);

            // Optimistically update the cache with the user's message
            queryClient.setQueryData(['ai-sessions', sessionId], (old: any) => {
                if (!old) return old;
                // If it's already there (e.g. somehow), don't duplicate, but usually it's not.
                return {
                    ...old,
                    messages: [
                        ...old.messages,
                        {
                            id: 'temp-user-' + Date.now(),
                            role: 'user',
                            content: userContent,
                            created_at: new Date().toISOString()
                        }
                    ]
                };
            });

            // Unconditional scroll to bottom when sending a message
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);

            abortControllerRef.current = new AbortController();

            try {
                const token = useAuthStore.getState().token;
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                const response = await fetch(`${baseUrl}/api/ai/sessions/${sessionId}/messages/stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ content: userContent }),
                    signal: abortControllerRef.current.signal
                });

                if (!response.ok) {
                    const text = await response.text();
                    let errDetail = text;
                    try {
                        const data = JSON.parse(text);
                        errDetail = data.detail || text;
                    } catch(e) {}
                    throw new Error(`LLM Error ${response.status}: ${errDetail}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('ReadableStream not supported');

                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const cleaned = line.trim();
                        if (cleaned.startsWith('data:')) {
                            const jsonStr = cleaned.startsWith('data: ') ? cleaned.substring(6) : cleaned.substring(5);
                            if (jsonStr.trim() === '[DONE]') {
                                setIsThinking(false);
                                setIsThinkingExpanded(false);
                                setToolCalls(prev => prev.map(tc => ({ ...tc, done: true })));
                                queryClient.invalidateQueries({ queryKey: ['ai-sessions', sessionId] });
                                continue;
                            }
                            try {
                                const data = JSON.parse(jsonStr.trim());
                                if (data.event === 'user_message_created') {
                                    continue;
                                }

                                // Handle tool_result SSE events from backend
                                if (data.event === 'tool_result') {
                                    setToolResults(prev => [...prev, { tool_call_id: data.tool_call_id, name: data.name, result: data.result }]);
                                    setToolCalls(prev => prev.map(tc => tc.id === data.tool_call_id ? { ...tc, done: true } : tc));
                                    continue;
                                }

                                const choice = data.choices?.[0];
                                if (choice) {
                                    const delta = choice.delta;
                                    if (delta) {
                                        // 🧠 Thinking / Reasoning (DeepSeek reasoning_content, Ollama reasoning, Anthropic thinking)
                                        const reasoning = delta.reasoning || delta.reasoning_content || delta.thinking || "";
                                        if (reasoning) {
                                            setIsThinking(true);
                                            setIsThinkingExpanded(true);
                                            setThinkingText(prev => (prev || '') + reasoning);
                                        }

                                        // 💬 Content response
                                        const content = delta.content || "";
                                        if (content) {
                                            setIsThinking(false);
                                            setIsThinkingExpanded(false);
                                            setStreamingMessage(prev => (prev || '') + content);
                                        }

                                        // 🔧 Tool Calls
                                        const tcs = delta.tool_calls;
                                        if (tcs && Array.isArray(tcs)) {
                                            setIsThinking(false);
                                            setIsThinkingExpanded(false);
                                            setToolCalls(prev => {
                                                let updated = [...prev];
                                                for (const tc of tcs) {
                                                    const idx = tc.index;
                                                    const existingIndex = updated.findIndex(item => item.index === idx);
                                                    if (existingIndex === -1) {
                                                        updated.push({
                                                            index: idx,
                                                            id: tc.id || '',
                                                            name: tc.function?.name || '',
                                                            args: tc.function?.arguments || '',
                                                            done: false
                                                        });
                                                    } else {
                                                        const item = updated[existingIndex];
                                                        updated[existingIndex] = {
                                                            ...item,
                                                            id: tc.id || item.id,
                                                            name: tc.function?.name || item.name,
                                                            args: item.args + (tc.function?.arguments || '')
                                                        };
                                                    }
                                                }
                                                return updated;
                                            });
                                        }
                                    }

                                    // Removed premature finish_reason check to allow tool_result event to control completion
                                }
                            } catch (e) {
                                // Incomplete JSON chunk, skip
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(error);
                toast.error('Error receiving streaming response');
            } finally {
                // Use functional state updates to capture the absolute latest state
                setStreamingMessage(currentMessage => {
                    setThinkingText(currentThinking => {
                        setToolCalls(currentTools => {
                            setToolResults(currentResults => {
                                queryClient.setQueryData(['ai-sessions', sessionId], (old: any) => {
                                    if (!old) return old;
                                    return {
                                        ...old,
                                        messages: [
                                            ...old.messages,
                                            {
                                                id: 'temp-ai-' + Date.now(),
                                                role: 'ai',
                                                content: currentMessage,
                                                reasoning_content: currentThinking,
                                                tool_calls: currentTools.map(t => ({ id: t.id, type: 'function', name: t.name, arguments: t.args })),
                                                tool_results: currentResults,
                                                created_at: new Date().toISOString()
                                            }
                                        ]
                                    };
                                });
                                return [];
                            });
                            return [];
                        });
                        return null;
                    });
                    return '';
                });

                setIsStreaming(false);
                setIsThinking(false);
                setIsThinkingExpanded(false);
                queryClient.invalidateQueries({ queryKey: ['ai-sessions', sessionId] });
                queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
            }
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const activeBot: any = bots?.find(b => String(b.id) === String(selectedBot?.id)) || selectedBot || bots?.find(b => b.bot_id === currentSession?.bot_id) || bots?.[0] || {
        id: 'default',
        name: 'AI Assistant',
        avatar_config: { icon: 'Brain', color: 'bg-brand', tagline: 'Intelligence Hub' },
        bot_id: 'default',
        tools_config: { enable_sql_tool: false, mcp_servers: [] }
    };

    const filteredSessions = sessions?.filter(s => s.bot_id === activeBot.bot_id && s.messages.length > 0) || [];

    // ─── Render Logic ───
    if (!selectedBot && !currentSessionId) {
        return (
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {/* Hub Header */}
                <div className="shrink-0 h-16 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between bg-white dark:bg-slate-950 z-20">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 bg-brand/10 rounded-lg text-brand shrink-0">
                            <Brain size={20} />
                        </div>
                        <div>
                            <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-none">AI Workspace</h1>
                            <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 hidden sm:block">Intelligent Assistants</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="text-[10px] md:text-xs font-bold text-slate-400 flex items-center gap-1.5 md:gap-2 hidden sm:flex">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            AI Engine: Hybrid
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            {sessions && sessions.length > 0 && (
                                <button
                                    onClick={() => {
                                        const last = sessions[0];
                                        const bot = bots?.find(b => b.bot_id === last.bot_id);
                                        if (bot) setSelectedBot(bot);
                                        setCurrentSessionId(last.id);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <History size={14} /> Resume Last
                                </button>
                            )}
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-slate-900 dark:bg-brand text-white rounded-lg text-[10px] md:text-xs font-bold hover:bg-slate-800 dark:hover:bg-brand/90 transition-colors shadow-lg shadow-slate-200 dark:shadow-brand/20 whitespace-nowrap"
                            >
                                <Plus size={14} /> <span className="hidden sm:inline">New Custom Bot</span><span className="sm:hidden">New Bot</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-6 md:py-12">
                        <div className="mb-8 md:mb-12 text-center">
                            <div className="inline-flex items-center justify-center p-3 bg-brand/10 text-brand rounded-2xl mb-4 animate-in zoom-in duration-500">
                                <Cpu size={24} className="md:w-8 md:h-8" />
                            </div>
                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">AI Intelligence Hub</h1>
                            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed px-2">
                                Unlock the power of your data with specialized AI agents designed for enterprise-scale business intelligence.
                            </p>
                        </div>

                        {isLoadingBots ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 size={48} className="animate-spin text-brand/20" />
                            </div>
                        ) : bots && bots.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {bots.map((bot) => (
                                    <div key={bot.id} className="group relative flex flex-col h-full">
                                        <button
                                            onClick={() => handleBotSelect(bot)}
                                            className="flex-1 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col h-full"
                                        >
                                            <div className={`${bot.avatar_config.color || 'bg-brand'} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-brand/10 group-hover:scale-110 transition-transform`}>
                                                {ICON_MAP[bot.avatar_config.icon] || <Brain size={24} />}
                                            </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">{bot.avatar_config.tagline}</div>
                                                {!bot.is_system && (
                                                    <span className="px-2 py-0.5 bg-brand/10 text-brand text-[8px] font-black uppercase tracking-tighter rounded-full border border-brand/10 whitespace-nowrap">
                                                        Custom Agent
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{bot.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">{bot.description}</p>
                                            <div className="mt-6 flex items-center gap-2 text-brand font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                Start Chatting <ChevronLeft size={16} className="rotate-180" />
                                            </div>
                                        </button>
                                        {!bot.is_system && (
                                            <div className="absolute top-4 right-4 flex gap-1 z-30">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingBot(bot); setIsCreateModalOpen(true); }}
                                                    className="p-2 bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700 rounded-xl text-slate-400 hover:text-brand hover:scale-110 transition-all"
                                                    title="Edit Assistant"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (confirm('Are you sure you want to delete this custom assistant?')) deleteBotMutation.mutate(bot.id); }}
                                                    className="p-2 bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-500 hover:scale-110 transition-all"
                                                    title="Delete Assistant"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-700">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
                                    <Brain size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No AI Assistants Yet</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm text-center mb-8">
                                    Create your first custom AI agent to start exploring your enterprise data with natural language.
                                </p>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-3 px-8 py-4 bg-brand text-white rounded-2xl font-bold hover:bg-brand/90 hover:scale-105 transition-all shadow-xl shadow-brand/20"
                                >
                                    <Plus size={20} /> Create Your First Agent
                                </button>
                            </div>
                        )}

                        {/* Quick Stats/Insights Footer */}
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Lightbulb size={20} /></div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI Suggestion</div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300">"Compare APAC revenue vs EMEA for Q2 outliers."</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Sparkles size={20} /></div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">New Skill</div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300">Query Assistant now supports Snowflake SQL dialects.</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg"><AlertCircle size={20} /></div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Alert</div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300">2 anomalies detected in Inventory tracking system.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {isCreateModalOpen && (
                    <CreateBotModal
                        onClose={() => { setIsCreateModalOpen(false); setEditingBot(null); }}
                        editingBot={editingBot}
                    />
                )}
            </div>
        );
    }

    // ─── Chat View ───
    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0a0a0f] overflow-hidden relative">
            {/* ─── Chat Top Bar ─── */}
            <div className="shrink-0 h-16 md:h-20 border-b border-slate-200 dark:border-slate-800/60 px-4 md:px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 shadow-sm">
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={() => { stopStreaming(); setSelectedBot(null); setCurrentSessionId(null); }}
                        className="p-2 md:p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-6 md:h-8 w-px bg-slate-200 dark:bg-slate-800/60" />
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white shadow-lg ${activeBot.avatar_config.color.includes('brand') ? 'from-brand to-brand/80 shadow-brand/20' : activeBot.avatar_config.color.replace('bg-', 'from-').replace('text-', '') + ' to-black/20'}`}>
                            {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={16} className="md:w-5 md:h-5" />}
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 md:w-3.5 md:h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight truncate max-w-[150px] md:max-w-xs">{activeBot.name}</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online & Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:hidden">
                    <button 
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex min-h-0 relative">
                {/* Mobile Sidebar Overlay */}
                {isMobileSidebarOpen && (
                    <div 
                        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                )}
                
                {/* Sidebar Container */}
                <div className={`absolute lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:transform-none lg:block ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    <AIChatSidebar 
                        sessions={filteredSessions}
                        bots={bots || []}
                        isLoadingSessions={isLoadingSessions}
                        currentSessionId={currentSessionId}
                        onSessionSelect={(sessionId, bot) => {
                            stopStreaming();
                            setCurrentSessionId(sessionId);
                            if (bot) setSelectedBot(bot);
                            setIsMobileSidebarOpen(false);
                        }}
                        onDeleteSession={(sessionId) => deleteSessionMutation.mutate(sessionId)}
                        onNewConversation={() => {
                            stopStreaming();
                            setCurrentSessionId(null);
                            setIsMobileSidebarOpen(false);
                        }}
                    />
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-transparent min-w-0">
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 custom-scrollbar" id="chat-scroll-container">
                        {isLoadingMessages && currentSessionId ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-brand/20" />
                            </div>
                        ) : (
                            <>
                                {(!currentSession || currentSession.messages.length === 0) && (
                                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-8 animate-in zoom-in-95 duration-500">
                                        <div className="relative mb-8 group">
                                            <div className={`absolute inset-0 blur-2xl rounded-full group-hover:opacity-70 transition-opacity duration-500 opacity-50 ${activeBot.avatar_config.color}`} />
                                            <div className={`relative w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl rotate-3 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105 ${activeBot.avatar_config.color}`}>
                                                {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={40} />}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Start your analysis</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                            Ask a question about your business data using the <b>{activeBot.name}</b>. Your conversation will be saved once you send a message.
                                        </p>
                                    </div>
                                )}
                                
                                {currentSession && (
                                    <AIChatMessageList messages={currentSession.messages} activeBot={activeBot} />
                                )}

                                {isStreaming && (
                                    <AIStreamingBlock 
                                        activeBot={activeBot}
                                        isThinking={isThinking}
                                        thinkingText={thinkingText}
                                        isThinkingExpanded={isThinkingExpanded}
                                        setIsThinkingExpanded={setIsThinkingExpanded}
                                        toolCalls={toolCalls}
                                        toolResults={toolResults}
                                        streamingMessage={streamingMessage}
                                    />
                                )}
                            </>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <AIChatInput 
                        activeBot={activeBot}
                        isStreaming={isStreaming || createSessionMutation.isPending}
                        onSend={handleSend}
                        onStopStreaming={stopStreaming}
                        onToggleSqlTool={(botId, enableSql) => toggleSqlToolMutation.mutate({ botId, enableSql })}
                        onAddMcp={(botId, server) => addQuickMcpMutation.mutate({ botId, name: server.name, url: server.url })}
                        onRemoveMcp={(botId, index) => removeQuickMcpMutation.mutate({ botId, index })}
                    />
                </div>
            </div>
            {isCreateModalOpen && (
                <CreateBotModal
                    onClose={() => { setIsCreateModalOpen(false); setEditingBot(null); }}
                    editingBot={editingBot}
                />
            )}
        </div>
    );
};

export default AIWorkspacePage;
