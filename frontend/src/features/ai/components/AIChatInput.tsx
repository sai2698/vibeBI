import React, { useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import type { AIBot } from './types';

interface AIChatInputProps {
    activeBot: AIBot;
    isStreaming: boolean;
    onSend: (text: string) => void;
    onStopStreaming: () => void;
}

const AIChatInput: React.FC<AIChatInputProps> = ({
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

            
            <div className="max-w-4xl mx-auto relative group">

                <div className="flex flex-col bg-white dark:bg-[#161622] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm focus-within:shadow-md focus-within:border-brand/40 transition-all duration-300">
                    <div className="flex items-end px-2 py-2">
                        {/* Paperclip Button */}
                        <div className="px-2 pb-1.5 shrink-0">
                            <button
                                type="button"
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                title="Attach context (mock)"
                            >
                                <Paperclip size={18} />
                            </button>
                        </div>

                        {/* Input Area */}
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
                            placeholder="Ask your question..."
                            className="flex-1 max-h-48 min-h-[40px] py-2.5 px-2 bg-transparent border-0 resize-none outline-none text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 custom-scrollbar overflow-y-auto"
                            rows={1}
                        />
                        
                        {/* Send / Stop Button */}
                        <div className="px-2 pb-1 shrink-0">
                            {isStreaming ? (
                                <button
                                    onClick={onStopStreaming}
                                    className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 shadow-sm"
                                    title="Stop generating"
                                >
                                    <div className="w-3 h-3 bg-current rounded-[2px]" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleSend();
                                        const ta = document.querySelector('textarea');
                                        if(ta) ta.style.height = 'auto';
                                    }}
                                    disabled={!query.trim()}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                                        query.trim() 
                                            ? 'bg-brand text-white hover:bg-brand-dark hover:scale-105 shadow-sm shadow-brand/20' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                                    }`}
                                >
                                    <Send size={16} className={`${query.trim() ? '-translate-x-0.5 translate-y-0.5' : ''} transition-transform`} />
                                </button>
                            )}
                        </div>
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
