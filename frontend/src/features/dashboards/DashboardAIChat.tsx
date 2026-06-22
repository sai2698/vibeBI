import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Brain, X, Loader2, User } from 'lucide-react';

import type { AIBot, ChatSession } from '../ai/components/types';
import AIChatMessageList from '../ai/components/AIChatMessageList';
import AIStreamingBlock from '../ai/components/AIStreamingBlock';
import AIChatInput from '../ai/components/AIChatInput';
import { useStreamingChat } from '../ai/hooks/useStreamingChat';

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

  // ─── Streaming Chat Hook ───────────────────────────────────────────────────
  const {
    streamingMessage,
    thinkingText,
    isStreaming,
    isThinking,
    isThinkingExpanded,
    toolCalls,
    toolResults,
    pendingUserMessage,
    setIsThinkingExpanded,
    sendMessage,
    stopStreaming,
    chatEndRef,
    scrollContainerRef,
  } = useStreamingChat({
    extraBody: {
      context_dataset_ids: contextDatasetIds,
      llm_config_override: llmConfigOverride,
      dashboard_name: dashboardName,
    }
  });

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

  const handleSend = useCallback(async (userContent: string) => {
    if (!userContent.trim() || isStreaming) return;

    const resultSessionId = await sendMessage(
      userContent,
      currentSessionId,
      activeBot.bot_id,
      async () => {
        const newSession = await createSessionMutation.mutateAsync(activeBot.bot_id);
        setCurrentSessionId(newSession.id);
        return newSession;
      },
      (sessionId, message) => {
        generateTitleMutation.mutate({ sessionId, message });
      }
    );

    if (resultSessionId && !currentSessionId) {
      setCurrentSessionId(resultSessionId);
    }
  }, [isStreaming, currentSessionId, sendMessage, createSessionMutation, generateTitleMutation, activeBot.bot_id]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full md:w-[750px] bg-slate-50 dark:bg-[#0a0a0f] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800/60">
        
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
                {(!currentSession || currentSession.messages.length === 0) && !pendingUserMessage && (
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

                {/* Instant pending user message */}
                {pendingUserMessage && (
                  <div className="w-full flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-200 mb-6">
                    <div className="flex justify-end w-full max-w-3xl pl-12">
                      <div className="rounded-[20px] rounded-tr-sm px-5 py-3.5 leading-relaxed bg-[#e1effe] dark:bg-indigo-900/40 text-slate-900 dark:text-slate-100 shadow-sm inline-block">
                        <div className="markdown-container">
                          <p className="mb-0 text-[13px] whitespace-pre-wrap">{pendingUserMessage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
