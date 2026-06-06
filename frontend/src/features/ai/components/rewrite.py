import re

with open("/home/naveen/BI/frontend/src/features/ai/AIWorkspacePage.tsx", "r") as f:
    content = f.read()

# Add imports at the top
import_block = """import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Sparkles, AlertCircle, TrendingUp, Lightbulb,
    Terminal, ChevronLeft, History, MessageSquare,
    User, Trash2, Cpu, Zap, Brain, Plus, Loader2,
    Globe, Shield, Database, Settings, X, Check, ChevronDown, Wrench
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../api';
import { toast } from 'react-hot-toast';

import { AIBot, Message, ChatSession, ICON_MAP } from './components/types';
import CreateBotModal from './components/CreateBotModal';
import AIChatSidebar from './components/AIChatSidebar';
import AIChatMessageList from './components/AIChatMessageList';
import AIStreamingBlock from './components/AIStreamingBlock';
import AIChatInput from './components/AIChatInput';"""

# Replace imports
content = re.sub(r"import React,.*?import CreateBotModal from './components/CreateBotModal';", import_block, content, flags=re.DOTALL)

# Let's target the Chat View Replacement
chat_view_start = content.find("// ─── Chat View ───")

chat_view_replacement = """// ─── Chat View ───
    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
            {/* ─── Chat Top Bar ─── */}
            <div className="shrink-0 h-16 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-950 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setSelectedBot(null); setCurrentSessionId(null); }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="flex items-center gap-3">
                        <div className={`${activeBot.avatar_config.color} p-2 rounded-lg text-white shadow-sm`}>
                            {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={20} />}
                        </div>
                        <div className="text-left">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{activeBot.name}</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Online & Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex min-h-0">
                <AIChatSidebar 
                    sessions={filteredSessions}
                    bots={bots || []}
                    isLoadingSessions={isLoadingSessions}
                    currentSessionId={currentSessionId}
                    onSessionSelect={(sessionId, bot) => {
                        setCurrentSessionId(sessionId);
                        if (bot) setSelectedBot(bot);
                    }}
                    onDeleteSession={(sessionId) => deleteSessionMutation.mutate(sessionId)}
                    onNewConversation={() => setCurrentSessionId(null)}
                />

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 min-w-0">
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar" id="chat-scroll-container">
                        {isLoadingMessages && currentSessionId ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-brand/20" />
                            </div>
                        ) : (
                            <>
                                {(!currentSession || currentSession.messages.length === 0) && (
                                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                        <div className={`${activeBot.avatar_config.color} p-4 rounded-3xl text-white mb-6 shadow-xl`}>
                                            {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={32} />}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Start your analysis</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
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
                        onSend={(text) => {
                            // Call the existing handleSend but we need to set the query first
                            // Wait, handleSend relies on 'query' state. 
                            // In this refactor, I will modify handleSend to accept text argument, or just setQuery and handleSend.
                        }}
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
"""

new_content = content[:chat_view_start] + chat_view_replacement

with open("/home/naveen/BI/frontend/src/features/ai/AIWorkspacePage.tsx", "w") as f:
    f.write(new_content)

