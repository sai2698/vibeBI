import React, { useState } from 'react';
import { Send } from 'lucide-react';
import type { AIBot } from './types';

interface AIChatInputProps {
    activeBot: AIBot;
    isStreaming: boolean;
    onSend: (text: string) => void;
    onStopStreaming: () => void;
}

const AIChatInput: React.FC<AIChatInputProps> = ({
    activeBot,
    isStreaming,
    onSend,
    onStopStreaming
}) => {
    const [query, setQuery] = useState('');

    const handleSend = () => {
        if (!query.trim() || isStreaming) return;
        onSend(query);
        setQuery('');
    };

    return (
        <div className="shrink-0 p-4 sm:p-6 bg-transparent relative">
            {isStreaming && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex justify-center z-10">
                    <button
                        onClick={onStopStreaming}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-[11px] font-bold tracking-wide"
                    >
                        <div className="w-2.5 h-2.5 bg-white dark:bg-slate-900 rounded-sm animate-pulse" />
                        Stop Generating
                    </button>
                </div>
            )}
            
            <div className="max-w-4xl mx-auto relative group">

                <div className="flex flex-col bg-white dark:bg-[#161622] border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-sm focus-within:shadow-md focus-within:ring-4 focus-within:ring-brand/10 focus-within:border-brand/40 transition-all duration-300">
                    <textarea
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                                e.currentTarget.style.height = 'auto';
                            }
                        }}
                        placeholder={`Message ${activeBot.name}...`}
                        className="w-full max-h-48 min-h-[52px] py-4 px-5 bg-transparent border-0 resize-none outline-none text-base leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 custom-scrollbar overflow-y-auto rounded-[28px]"
                        rows={1}
                    />
                    
                    <div className="flex items-center justify-end px-3 pb-3">
                        <button
                            onClick={() => {
                                handleSend();
                                // Reset textarea height on send
                                const ta = document.querySelector('textarea');
                                if(ta) ta.style.height = 'auto';
                            }}
                            disabled={!query.trim() || isStreaming}
                            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                                query.trim() && !isStreaming 
                                    ? 'bg-brand text-white shadow-md shadow-brand/20 hover:scale-105 hover:bg-brand/90' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                            }`}
                        >
                            <Send size={18} className={`${query.trim() && !isStreaming ? 'translate-x-0.5' : ''} ${isStreaming ? 'animate-pulse' : ''} transition-transform`} />
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-4">
                <span className="text-[11px] text-slate-400 font-medium">Enterprise Assistant can make mistakes. Consider verifying critical business information.</span>
            </div>
        </div>
    );
};

export default AIChatInput;
