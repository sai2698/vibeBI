import React from 'react';
import { Brain, Check, Loader2, Wrench, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ICON_MAP } from './types';
import type { AIBot } from './types';
import EChartWrapper from '../../../components/charts/EChartWrapper';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';

interface ToolCall {
    index: number;
    name: string;
    id: string;
    args: string;
    done?: boolean;
}

interface ToolResult {
    tool_call_id: string;
    name: string;
    result: string;
}

interface AIStreamingBlockProps {
    activeBot: AIBot;
    isThinking: boolean;
    thinkingText: string | null;
    isThinkingExpanded: boolean;
    setIsThinkingExpanded: (val: boolean) => void;
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
    streamingMessage: string | null;
}

const AIStreamingBlock: React.FC<AIStreamingBlockProps> = ({
    activeBot,
    isThinking,
    thinkingText,
    isThinkingExpanded,
    setIsThinkingExpanded,
    toolCalls,
    toolResults,
    streamingMessage
}) => {
    return (
        <div className="w-full flex justify-center animate-in fade-in duration-300">
            <div className="flex gap-4 w-full max-w-3xl">
                <div className={`shrink-0 w-8 h-8 mt-1 rounded-xl flex items-center justify-center ${activeBot.avatar_config.color} text-white shadow-sm`}>
                    {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={16} />}
                </div>
                <div className="space-y-2 min-w-0 flex-1">
                    {/* ── Agentic Engine Block ── */}
                    {(isThinking || thinkingText || toolCalls.length > 0) && (
                        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden shadow-sm">
                            <div className="px-4 py-2.5 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/60">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800">
                                        {isThinking ? (
                                            <Loader2 size={10} className="animate-spin text-brand" />
                                        ) : !isThinking && toolCalls.length === 0 ? (
                                            <div className="flex gap-1 py-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 px-1 text-left">
                                        {isThinking ? '💭 Reasoning...' : toolCalls.some(tc => !tc.done) ? '🔧 Calling tools...' : 'Generating...'}
                                    </div>
                                </div>
                            </div>

                            {/* Live Thinking/Reasoning Stream */}
                            {(isThinking || thinkingText) && (
                                <div className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 bg-amber-50/30 dark:bg-amber-950/10">
                                    <button
                                        onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors text-left"
                                    >
                                        <Brain size={12} className="text-amber-500 shrink-0" />
                                        <span className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase tracking-wider">Thought Process</span>
                                        <ChevronDown size={14} className={`ml-auto text-amber-400/70 shrink-0 transition-transform ${isThinkingExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isThinkingExpanded && thinkingText && (
                                        <div className="px-4 pb-3">
                                            <div className="mt-1 max-h-48 overflow-y-auto custom-scrollbar text-xs text-amber-800/70 dark:text-amber-200/60 font-mono leading-relaxed whitespace-pre-wrap">
                                                {thinkingText}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Live Tool Calls & Results */}
                            {toolCalls.map((tc, tIdx) => {
                                const result = toolResults.find(r => r.tool_call_id === tc.id);
                                let chartConfig = null;
                                if (tc.name === 'render_chart' && tc.args) {
                                    try {
                                        chartConfig = JSON.parse(tc.args);
                                    } catch (e) {
                                        // Still streaming args, skip rendering chart until complete/valid JSON
                                    }
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
                                            onClick={(e) => { const el = (e.currentTarget.nextElementSibling as HTMLElement); if (el) el.classList.toggle('hidden'); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                                        >
                                            {tc.done ? <Check size={12} className="text-emerald-500 shrink-0" /> : <Loader2 size={12} className="animate-spin text-brand shrink-0" />}
                                            <Wrench size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{tc.name}</span>
                                            <ChevronDown size={14} className="ml-auto text-slate-400 shrink-0" />
                                        </button>
                                        <div className="hidden">
                                            {tc.args && <pre className="px-4 py-2 text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all">{tc.args}</pre>}
                                            {result && (
                                                <div className="px-4 py-2 border-t border-slate-100/50 dark:border-slate-800/50">
                                                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Result</div>
                                                    <div className="overflow-x-auto max-h-48 custom-scrollbar text-[11px] text-slate-600 dark:text-slate-400">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.result}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Main Response Content ── */}
                    <div className="rounded-2xl px-6 py-4 leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 text-left">
                        {streamingMessage ? (
                            <div className="markdown-container">
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
                                    {streamingMessage + " ▍"}
                                </ReactMarkdown>
                            </div>
                        ) : !isThinking && toolCalls.length === 0 ? (
                            <div className="flex gap-1 py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIStreamingBlock;
