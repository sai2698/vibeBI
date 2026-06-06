import React, { useMemo, useState } from 'react';
import { Brain, User, Check, Wrench, ChevronDown, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ICON_MAP } from './types';
import type { Message, AIBot } from './types';
import { MARKDOWN_COMPONENTS } from './AIStreamingBlock';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';

// Lazy-load EChartWrapper — same as streaming block
const LazyEChartWrapper = React.lazy(() => import('../../../components/charts/EChartWrapper'));

// ─── Tool result markdown components (smaller text variant) ─────────────────

const TOOL_RESULT_MD_COMPONENTS: Record<string, React.FC<any>> = {
    table: ({ children }) => <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">{children}</table>,
    thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>,
    tbody: ({ children }) => <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>,
    th: ({ children }) => <th className="px-3 py-1.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{children}</th>,
    td: ({ children }) => <td className="px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{children}</td>,
    p: ({ children }) => <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{children}</p>,
};

// ─── Chart Skeleton (matches streaming block) ──────────────────────────────

const ChartSkeleton = React.memo(() => (
    <div className="p-4 border-b border-slate-100/50 dark:border-slate-800/50">
        <div className="flex flex-col items-center justify-center h-[300px] bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/50">
            <BarChart3 size={32} className="text-brand/20 mb-3" />
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Loading Chart...</div>
        </div>
    </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

// ─── Memoized Chart Renderer ────────────────────────────────────────────────

const HistoricalChart = React.memo<{ argsJson: string }>(({ argsJson }) => {
    const chartConfig = useMemo(() => {
        try {
            return JSON.parse(argsJson);
        } catch (e) {
            return null;
        }
    }, [argsJson]);

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
HistoricalChart.displayName = 'HistoricalChart';

// ─── Memoized Tool Call Item (Historical) ───────────────────────────────────

const HistoricalToolItem = React.memo<{
    tc: { id: string; name: string; arguments: string };
    result?: { tool_call_id: string; name: string; result: string };
}>(({ tc, result }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isChartTool = tc.name === 'render_chart';

    return (
        <div className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
            {isChartTool && tc.arguments && <HistoricalChart argsJson={tc.arguments} />}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                <Check size={12} className="text-emerald-500 shrink-0" />
                <Wrench size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">{tc.name}</span>
                <ChevronDown size={14} className={`ml-auto text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div>
                    {tc.arguments && <pre className="px-4 py-2 text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all">{tc.arguments}</pre>}
                    {result && (
                        <div className="px-4 py-2 border-t border-slate-100/50 dark:border-slate-800/50 overflow-hidden">
                            <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Result</div>
                            <div className="overflow-x-auto max-h-64 custom-scrollbar text-[11px] text-slate-600 dark:text-slate-400">
                                <div className="markdown-container text-xs">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={TOOL_RESULT_MD_COMPONENTS}>{result.result}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
HistoricalToolItem.displayName = 'HistoricalToolItem';

// ─── Memoized Single Message Row ────────────────────────────────────────────

const MessageRow = React.memo<{ msg: Message; activeBot: AIBot }>(({ msg, activeBot }) => {
    const hasAgenticContent = msg.role === 'ai' && (msg.reasoning_content || (msg.tool_calls && msg.tool_calls.length > 0));

    return (
        <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex gap-4 w-full max-w-3xl">
                <div className={`shrink-0 w-8 h-8 mt-1 rounded-xl flex items-center justify-center shadow-sm ${msg.role === 'ai' ? `${activeBot.avatar_config.color} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                    {msg.role === 'ai' ? (ICON_MAP[activeBot.avatar_config.icon] || <Brain size={16} />) : <User size={16} />}
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Agentic Engine Block (Historical) */}
                    {hasAgenticContent && (
                        <AgenticBlock msg={msg} />
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
                                components={MARKDOWN_COMPONENTS}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    // Historical messages are immutable — skip re-render if same message
    return prev.msg.id === next.msg.id
        && prev.msg.content === next.msg.content
        && prev.activeBot.id === next.activeBot.id;
});
MessageRow.displayName = 'MessageRow';

// ─── Agentic Block (Historical) ────────────────────────────────────────────

const AgenticBlock = React.memo<{ msg: Message }>(({ msg }) => {
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
    const toolCallCount = msg.tool_calls?.length || 0;

    return (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-500">
                        <Check size={10} />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 px-1 text-left uppercase tracking-wider">
                        {toolCallCount > 0 ? `Completed ${toolCallCount} Tool${toolCallCount > 1 ? 's' : ''}` : 'Reasoning Completed'}
                    </div>
                </div>
            </div>

            {/* Reasoning Stream (Historical) */}
            {msg.reasoning_content && (
                <div className="border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 bg-amber-50/30 dark:bg-amber-950/10">
                    <button
                        onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors text-left"
                    >
                        <Brain size={12} className="text-amber-500 shrink-0" />
                        <span className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase tracking-wider">Thought Process</span>
                        <ChevronDown size={14} className={`ml-auto text-amber-400/70 shrink-0 transition-transform ${isReasoningExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isReasoningExpanded && (
                        <div className="px-4 pb-3">
                            <div className="mt-1 max-h-48 overflow-y-auto custom-scrollbar text-xs text-amber-800/70 dark:text-amber-200/60 font-mono leading-relaxed whitespace-pre-wrap">
                                {msg.reasoning_content}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tool Calls & Results (Historical) */}
            {msg.tool_calls && msg.tool_calls.map((tc: any, tIdx: number) => {
                const result = msg.tool_results?.find((r: any) => r.tool_call_id === tc.id);
                return <HistoricalToolItem key={tc.id || tIdx} tc={tc} result={result} />;
            })}
        </div>
    );
});
AgenticBlock.displayName = 'AgenticBlock';

// ─── Main List Component ────────────────────────────────────────────────────

interface AIChatMessageListProps {
    messages: Message[];
    activeBot: AIBot;
}

const AIChatMessageList: React.FC<AIChatMessageListProps> = ({ messages, activeBot }) => {
    return (
        <>
            {messages.map((msg, i) => (
                <MessageRow key={msg.id || i} msg={msg} activeBot={activeBot} />
            ))}
        </>
    );
};

export default React.memo(AIChatMessageList);
