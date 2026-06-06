import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Brain, Check, Loader2, Wrench, ChevronDown, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ICON_MAP } from './types';
import type { AIBot } from './types';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';

// Lazy-load EChartWrapper – heavy component should not block streaming UI
const LazyEChartWrapper = React.lazy(() => import('../../../components/charts/EChartWrapper'));

// ─── Shared markdown component config (module-level = stable identity) ──────

const MARKDOWN_COMPONENTS: Record<string, React.FC<any>> = {
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
};

export { MARKDOWN_COMPONENTS };

// ─── Sub-components (memoized) ──────────────────────────────────────────────

interface ToolCallItemProps {
    tc: { index: number; name: string; id: string; args: string; done?: boolean };
    result: { tool_call_id: string; name: string; result: string } | undefined;
}

const ChartSkeleton = React.memo(() => (
    <div className="p-4 border-b border-slate-100/50 dark:border-slate-800/50">
        <div className="flex flex-col items-center justify-center h-[300px] bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/50 animate-pulse">
            <BarChart3 size={32} className="text-brand/30 mb-3" />
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rendering Chart...</div>
            <div className="flex gap-1 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-bounce [animation-delay:0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-bounce [animation-delay:0.3s]" />
            </div>
        </div>
    </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

const CompletedChart = React.memo<{ args: string }>(({ args }) => {
    const chartConfig = useMemo(() => {
        try {
            return JSON.parse(args);
        } catch (e) {
            return null;
        }
    }, [args]);

    if (!chartConfig) return null;

    return (
        <div className="p-4 border-b border-slate-100/50 dark:border-slate-800/50">
            <ErrorBoundary fallbackMessage="Failed to render chart. The AI may have generated an invalid chart configuration.">
                <React.Suspense fallback={<ChartSkeleton />}>
                    <LazyEChartWrapper
                        chartType={chartConfig.chartType}
                        data={chartConfig.data}
                        title={chartConfig.title}
                        visualConfig={chartConfig.visualConfig}
                        height="300px"
                    />
                </React.Suspense>
            </ErrorBoundary>
        </div>
    );
});
CompletedChart.displayName = 'CompletedChart';

const ToolCallItem = React.memo<ToolCallItemProps>(({ tc, result }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isChartTool = tc.name === 'render_chart';

    return (
        <div className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
            {/* Chart: skeleton while streaming, real chart when done */}
            {isChartTool && !tc.done && <ChartSkeleton />}
            {isChartTool && tc.done && <CompletedChart args={tc.args} />}

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                {tc.done ? <Check size={12} className="text-emerald-500 shrink-0" /> : <Loader2 size={12} className="animate-spin text-brand shrink-0" />}
                <Wrench size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{tc.name}</span>
                <ChevronDown size={14} className={`ml-auto text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div>
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
            )}
        </div>
    );
}, (prev, next) => {
    // Custom comparator: only re-render when something meaningful changes
    return prev.tc.done === next.tc.done
        && prev.tc.args === next.tc.args
        && prev.tc.name === next.tc.name
        && prev.result === next.result;
});
ToolCallItem.displayName = 'ToolCallItem';

// ─── Debounced Markdown Renderer ────────────────────────────────────────────
// During active streaming, renders raw text. After a pause (250ms of no new tokens),
// switches to full ReactMarkdown rendering for a smooth experience.

const DebouncedMarkdown = React.memo<{ content: string; isActive: boolean }>(({ content, isActive }) => {
    const [debouncedContent, setDebouncedContent] = useState(content);
    const [shouldRenderMarkdown, setShouldRenderMarkdown] = useState(!isActive);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isActive) {
            // Streaming stopped — render full markdown immediately
            setDebouncedContent(content);
            setShouldRenderMarkdown(true);
            return;
        }

        // During streaming: update content immediately but debounce markdown parsing
        setDebouncedContent(content);
        setShouldRenderMarkdown(false);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setShouldRenderMarkdown(true);
        }, 250);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [content, isActive]);

    if (!debouncedContent) return null;

    if (shouldRenderMarkdown) {
        return (
            <div className="markdown-container">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={MARKDOWN_COMPONENTS}
                >
                    {debouncedContent + (isActive ? ' ▍' : '')}
                </ReactMarkdown>
            </div>
        );
    }

    // Fast path: raw text during rapid streaming
    return (
        <div className="markdown-container">
            <p className="mb-2 last:mb-0 text-[13px] whitespace-pre-wrap">{debouncedContent} ▍</p>
        </div>
    );
});
DebouncedMarkdown.displayName = 'DebouncedMarkdown';

// ─── Thinking Section (memoized) ────────────────────────────────────────────

const ThinkingSection = React.memo<{
    isThinking: boolean;
    thinkingText: string | null;
    isExpanded: boolean;
    onToggle: () => void;
}>(({ isThinking, thinkingText, isExpanded, onToggle }) => {
    if (!isThinking && !thinkingText) return null;

    return (
        <div className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 bg-amber-50/30 dark:bg-amber-950/10">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors text-left"
            >
                <Brain size={12} className="text-amber-500 shrink-0" />
                <span className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase tracking-wider">Thought Process</span>
                <ChevronDown size={14} className={`ml-auto text-amber-400/70 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && thinkingText && (
                <div className="px-4 pb-3">
                    <div className="mt-1 max-h-48 overflow-y-auto custom-scrollbar text-xs text-amber-800/70 dark:text-amber-200/60 font-mono leading-relaxed whitespace-pre-wrap">
                        {thinkingText}
                    </div>
                </div>
            )}
        </div>
    );
});
ThinkingSection.displayName = 'ThinkingSection';

// ─── Main Component ─────────────────────────────────────────────────────────

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
    const hasAgenticContent = isThinking || !!thinkingText || toolCalls.length > 0;
    const isActivelyStreaming = !!(streamingMessage || isThinking || toolCalls.some(tc => !tc.done));

    // Determine header status text
    const statusText = isThinking
        ? '💭 Reasoning...'
        : toolCalls.some(tc => !tc.done)
            ? '🔧 Calling tools...'
            : toolCalls.length > 0 && toolCalls.every(tc => tc.done) && streamingMessage
                ? '✨ Generating response...'
                : 'Generating...';

    return (
        <div className="w-full flex justify-center animate-in fade-in duration-300">
            <div className="flex gap-4 w-full max-w-3xl">
                <div className={`shrink-0 w-8 h-8 mt-1 rounded-xl flex items-center justify-center ${activeBot.avatar_config.color} text-white shadow-sm`}>
                    {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={16} />}
                </div>
                <div className="space-y-2 min-w-0 flex-1">
                    {/* ── Agentic Engine Block ── */}
                    {hasAgenticContent && (
                        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden shadow-sm">
                            <div className="px-4 py-2.5 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/60">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800">
                                        {isThinking ? (
                                            <Loader2 size={10} className="animate-spin text-brand" />
                                        ) : toolCalls.some(tc => !tc.done) ? (
                                            <Loader2 size={10} className="animate-spin text-brand" />
                                        ) : !streamingMessage ? (
                                            <div className="flex gap-1 py-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                                            </div>
                                        ) : (
                                            <Check size={10} className="text-emerald-500" />
                                        )}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 px-1 text-left">
                                        {statusText}
                                    </div>
                                </div>
                            </div>

                            {/* Thinking Section */}
                            <ThinkingSection
                                isThinking={isThinking}
                                thinkingText={thinkingText}
                                isExpanded={isThinkingExpanded}
                                onToggle={() => setIsThinkingExpanded(!isThinkingExpanded)}
                            />

                            {/* Tool Calls & Results */}
                            {toolCalls.map((tc, tIdx) => {
                                const result = toolResults.find(r => r.tool_call_id === tc.id);
                                return (
                                    <ToolCallItem key={tc.id || tIdx} tc={tc} result={result} />
                                );
                            })}
                        </div>
                    )}

                    {/* ── Main Response Content ── */}
                    <div className="rounded-2xl px-6 py-4 leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 text-left">
                        {streamingMessage ? (
                            <DebouncedMarkdown content={streamingMessage} isActive={isActivelyStreaming} />
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
