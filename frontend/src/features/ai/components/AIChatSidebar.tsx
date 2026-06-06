import React from 'react';
import { History, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import type { ChatSession, AIBot } from './types';

interface AIChatSidebarProps {
    sessions: ChatSession[];
    bots: AIBot[];
    isLoadingSessions: boolean;
    currentSessionId: string | null;
    onSessionSelect: (sessionId: string, bot: AIBot | undefined) => void;
    onDeleteSession: (sessionId: string) => void;
    onNewConversation: () => void;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
    sessions,
    bots,
    isLoadingSessions,
    currentSessionId,
    onSessionSelect,
    onDeleteSession,
    onNewConversation
}) => {
    return (
        <div className="w-72 h-full shrink-0 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col shadow-xl lg:shadow-none">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <History size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Bot History</span>
                </div>
                {isLoadingSessions && <Loader2 size={14} className="animate-spin text-slate-400" />}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {sessions.map(chat => (
                    <div key={chat.id} className="relative group">
                        <button
                            onClick={() => {
                                const bot = bots?.find(b => b.bot_id === chat.bot_id);
                                onSessionSelect(chat.id, bot);
                            }}
                            className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left border ${currentSessionId === chat.id
                                ? 'bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800'
                                : 'hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm border-transparent hover:border-slate-100 dark:hover:border-slate-700'
                                }`}
                        >
                            <div className={`mt-0.5 p-1.5 rounded-lg transition-colors ${currentSessionId === chat.id ? 'bg-brand/10 text-brand' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand'
                                }`}>
                                <MessageSquare size={14} />
                            </div>
                            <div className="min-w-0 pr-6">
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{chat.title}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(chat.created_at).toLocaleDateString()}</div>
                            </div>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('Delete chat?')) onDeleteSession(chat.id); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={onNewConversation}
                    className="w-full py-2 bg-slate-900 dark:bg-brand text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-brand/90 transition-colors shadow-lg shadow-slate-200 dark:shadow-brand/20"
                >
                    New Conversation
                </button>
            </div>
        </div>
    );
};

export default AIChatSidebar;
