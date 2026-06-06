import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Brain, X, Loader2 } from 'lucide-react';

import type { AIBot, ChatSession } from '../ai/components/types';
import AIChatMessageList from '../ai/components/AIChatMessageList';
import AIStreamingBlock from '../ai/components/AIStreamingBlock';
import AIChatInput from '../ai/components/AIChatInput';

interface DashboardAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardName: string;
  contextDatasetIds: number[];
  llmConfigOverride?: any;
}

const DashboardAIChat: React.FC<DashboardAIChatProps> = ({
  isOpen,
  onClose,
  dashboardName,
  contextDatasetIds,
  llmConfigOverride
}) => {
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStreaming();
  }, []);

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

  const activeBot: any = {
    id: 'dashboard',
    name: 'Dashboard Assistant',
    avatar_config: { icon: 'Brain', color: 'bg-brand', tagline: 'Dashboard Insights' },
    bot_id: 'dashboard',
    tools_config: { enable_sql_tool: true, mcp_servers: [] },
    llm_config: llmConfigOverride || {}
  };

  // Create new session
  const createSessionMutation = useMutation({
    mutationFn: async (botId: string) => {
      const response = await api.post('/api/ai/sessions', {
        title: `Insights: ${dashboardName}`,
        bot_id: botId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
      setCurrentSessionId(data.id);
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

  const handleSend = async (userContent: string) => {
    if (!userContent.trim() || isStreaming) return;

    let sessionId = currentSessionId;
    let isNewSession = false;

    if (!sessionId) {
      try {
        const newSession = await createSessionMutation.mutateAsync(activeBot.bot_id);
        sessionId = newSession.id;
        isNewSession = true;
        setCurrentSessionId(sessionId);
      } catch (error) {
        toast.error('Failed to start session');
        return;
      }
    }

    if (isNewSession && sessionId) {
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

      queryClient.setQueryData(['ai-sessions', sessionId], (old: any) => {
        if (!old) return old;
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
          body: JSON.stringify({ 
            content: userContent,
            context_dataset_ids: contextDatasetIds,
            llm_config_override: llmConfigOverride,
            dashboard_name: dashboardName
          }),
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
                if (data.event === 'user_message_created') continue;

                if (data.event === 'tool_result') {
                  setToolResults(prev => [...prev, { tool_call_id: data.tool_call_id, name: data.name, result: data.result }]);
                  setToolCalls(prev => prev.map(tc => tc.id === data.tool_call_id ? { ...tc, done: true } : tc));
                  continue;
                }

                const choice = data.choices?.[0];
                if (choice) {
                  const delta = choice.delta;
                  if (delta) {
                    const reasoning = delta.reasoning || delta.reasoning_content || delta.thinking || "";
                    if (reasoning) {
                      setIsThinking(true);
                      setIsThinkingExpanded(true);
                      setThinkingText(prev => (prev || '') + reasoning);
                    }

                    const content = delta.content || "";
                    if (content) {
                      setIsThinking(false);
                      setIsThinkingExpanded(false);
                      setStreamingMessage(prev => (prev || '') + content);
                    }

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
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      } catch (error) {
        console.error(error);
        if ((error as any).name !== 'AbortError') {
          toast.error('Error receiving streaming response');
        }
      } finally {
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

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] lg:w-[500px] bg-slate-50 dark:bg-[#0a0a0f] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800/60">
        
        {/* Header */}
        <div className="shrink-0 h-20 border-b border-slate-200 dark:border-slate-800/60 px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl relative z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-brand to-brand/80 text-white shadow-lg shadow-brand/20">
              <Brain size={20} />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">AI Analyst</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Dashboard Context Active</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" id="chat-scroll-container">
            {isLoadingMessages && currentSessionId ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand/20" />
              </div>
            ) : (
              <>
                {(!currentSession || currentSession.messages.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-8 animate-in zoom-in-95 duration-500">
                    <div className="relative mb-8 group">
                      <div className="absolute inset-0 bg-brand/20 blur-2xl rounded-full group-hover:bg-brand/30 transition-colors duration-500" />
                      <div className="relative w-24 h-24 bg-gradient-to-tr from-brand to-indigo-400 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-brand/30 rotate-3 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105">
                        <Brain size={40} />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">AI Dashboard Analyst</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      I have analyzed the datasets powering these charts. Ask me to generate new views, summarize trends, or dig deeper into the data!
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
          />
        </div>
      </div>
    </>
  );
};

export default DashboardAIChat;
