import React from 'react';
import { Brain, User, Check, Wrench, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ICON_MAP } from './types';
import type { Message, AIBot } from './types';
import EChartWrapper from '../../../components/charts/EChartWrapper';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';

interface AIChatMessageListProps {
    messages: Message[];
    activeBot: AIBot;
}

const AIChatMessageList: React.FC<AIChatMessageListProps> = ({ messages, activeBot }) => {
    return (
        <>
            {messages.map((msg, i) => (
                <div key={i} className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex gap-4 w-full max-w-3xl">
                        <div className={`shrink-0 w-8 h-8 mt-1 rounded-xl flex items-center justify-center shadow-sm ${msg.role === 'ai' ? `${activeBot.avatar_config.color} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}>
                            {msg.role === 'ai' ? (ICON_MAP[activeBot.avatar_config.icon] || <Brain size={16} />) : <User size={16} />}
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                            {/* Agentic Engine Block (Historical) */}
                            {msg.role === 'ai' && (msg.reasoning_content || (msg.tool_calls && msg.tool_calls.length > 0)) && (
                                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden shadow-sm">
                                    {/* Header matching AIStreamingBlock */}
                                    <div className="px-4 py-2.5 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/60">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-500">
                                                <Check size={10} />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 px-1 text-left uppercase tracking-wider">
                                                {msg.tool_calls && msg.tool_calls.length > 0 ? `Completed ${msg.tool_calls.length} Tool${msg.tool_calls.length > 1 ? 's' : ''}` : 'Reasoning Completed'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reasoning Stream (Historical) */}
                                    {msg.reasoning_content && (
                                        <div className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 bg-amber-50/30 dark:bg-amber-950/10">
                                            <button
                                                onClick={(e) => {
                                                    const el = (e.currentTarget.nextElementSibling as HTMLElement);
                                                    if (el) {
                                                        el.classList.toggle('hidden');
                                                        const icon = e.currentTarget.querySelector('.chevron-icon');
                                                        if (icon) icon.classList.toggle('rotate-180');
                                                    }
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors text-left"
                                            >
                                                <Brain size={12} className="text-amber-500 shrink-0" />
                                                <span className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase tracking-wider">Thought Process</span>
                                                <ChevronDown size={14} className="chevron-icon ml-auto text-amber-400/70 shrink-0 transition-transform" />
                                            </button>
                                            <div className="hidden px-4 pb-3">
                                                <div className="mt-1 max-h-48 overflow-y-auto custom-scrollbar text-xs text-amber-800/70 dark:text-amber-200/60 font-mono leading-relaxed whitespace-pre-wrap">
                                                    {msg.reasoning_content}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tool Calls & Results (Historical) */}
                                    {msg.tool_calls && msg.tool_calls.map((tc: any, tIdx: number) => {
                                        const result = msg.tool_results?.find((r: any) => r.tool_call_id === tc.id);
                                        let chartConfig = null;
                                        if (tc.name === 'render_chart' && tc.arguments) {
                                            try {
                                                chartConfig = JSON.parse(tc.arguments);
                                            } catch (e) { }
                                        }

                                        return (
                                            <div key={tIdx} className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
                                                {chartConfig && (
                                                    <div className="p-4 border-b border-slate-100/50 dark:border-slate-800/50">
                                                        <ErrorBoundary fallbackMessage="Failed to render chart. The AI may have generated an invalid chart configuration.">
                                                            <EChartWrapper
                                                                chartType={chartConfig.chartType}
                                                                data={chartConfig.data}
                                                                title={chartConfig.title}
                                                                visualConfig={chartConfig.visualConfig}
                                                                height="300px"
                                                            />
                                                        </ErrorBoundary>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        const el = (e.currentTarget.nextElementSibling as HTMLElement);
                                                        if (el) {
                                                            el.classList.toggle('hidden');
                                                            const icon = e.currentTarget.querySelector('.chevron-icon');
                                                            if (icon) icon.classList.toggle('rotate-180');
                                                        }
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                                                >
                                                    <Check size={12} className="text-emerald-500 shrink-0" />
                                                    <Wrench size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{tc.name}</span>
                                                    <ChevronDown size={14} className="chevron-icon ml-auto text-slate-400 shrink-0 transition-transform" />
                                                </button>
                                                <div className="hidden">
                                                    {tc.arguments && <pre className="px-4 py-2 text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all">{tc.arguments}</pre>}
                                                    {result && (
                                                        <div className="px-4 py-2 border-t border-slate-100/50 dark:border-slate-800/50 overflow-hidden">
                                                            <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Result</div>
                                                            <div className="overflow-x-auto max-h-64 custom-scrollbar text-[11px] text-slate-600 dark:text-slate-400">
                                                                <div className="markdown-container text-xs">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                                                                        table: ({ children }) => <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">{children}</table>,
                                                                        thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>,
                                                                        tbody: ({ children }) => <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>,
                                                                        th: ({ children }) => <th className="px-3 py-1.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{children}</th>,
                                                                        td: ({ children }) => <td className="px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{children}</td>,
                                                                        p: ({ children }) => <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{children}</p>,
                                                                    }}>{result.result}</ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Main content bubble */}
                            <div className={`rounded-2xl px-6 py-4 leading-relaxed ${msg.role === 'user'
                                ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                                : 'bg-transparent text-slate-800 dark:text-slate-200'
                                }`}>
                                <div className="markdown-container overflow-x-auto">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0 text-[13px]">{children}</p>,
                                            h1: ({ children }) => <h1 className="text-lg font-extrabold text-slate-900 dark:text-white mt-4 mb-2">{children}</h1>,
                                            h2: ({ children }) => <h2 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1.5">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2.5 mb-1">{children}</h3>,
                                            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                                            li: ({ children }) => <li className="text-[13px] text-slate-700 dark:text-slate-300">{children}</li>,
                                            table: ({ children }) => <div className="overflow-x-auto w-full my-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm"><table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50 text-sm">{children}</table></div>,
                                            thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/50">{children}</thead>,
                                            tbody: ({ children }) => <tbody className="bg-white dark:bg-transparent divide-y divide-slate-100 dark:divide-slate-800/50">{children}</tbody>,
                                            th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{children}</th>,
                                            td: ({ children }) => <td className="px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{children}</td>,
                                            tr: ({ children }) => <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">{children}</tr>,
                                            code: ({ inline, className, children, ...props }: any) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline && match ? (
                                                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-xs my-3 font-mono border border-slate-800 shadow-inner">
                                                        <code className={className} {...props}>{children}</code>
                                                    </pre>
                                                ) : (
                                                    <code className="bg-slate-100 dark:bg-slate-800 text-brand px-1.5 py-0.5 rounded-md text-[11px] font-mono border border-slate-200 dark:border-slate-700" {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default AIChatMessageList;
