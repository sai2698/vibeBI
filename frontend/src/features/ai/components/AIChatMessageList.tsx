import React, { useMemo, useState } from 'react';
import { Brain, Check, ChevronDown, BarChart3 } from 'lucide-react';
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
        <div className="mb-2">
            {isChartTool && tc.arguments && <HistoricalChart argsJson={tc.arguments} />}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                <Check size={12} className="text-emerald-500 shrink-0" />
                <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Used tool: <span className="font-mono text-slate-800 dark:text-slate-200">{tc.name}</span></span>
                <ChevronDown size={12} className={`ml-1 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="ml-3 mt-1 pl-4 border-l-2 border-slate-100 dark:border-slate-800/50">
                    {tc.arguments && <pre className="py-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all">{tc.arguments}</pre>}
                    {result && (
                        <div className="py-2 mt-1 border-t border-slate-100/50 dark:border-slate-800/50 overflow-hidden">
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

    if (msg.role === 'user') {
        return (
            <div className="w-full flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300 mb-6">
                <div className="flex justify-end w-full max-w-3xl pl-12">
                    <div className="rounded-[20px] rounded-tr-sm px-5 py-3.5 leading-relaxed bg-[#e1effe] dark:bg-indigo-900/40 text-slate-900 dark:text-slate-100 shadow-sm inline-block">
                        <div className="markdown-container">
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
        );
    }

    return (
        <div className="w-full flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-300 mb-8">
            <div className="flex gap-4 w-full max-w-3xl">
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${activeBot.avatar_config.color} text-white`}>
                    {ICON_MAP[activeBot.avatar_config.icon] || <Brain size={16} />}
                </div>
                <div className="space-y-3 min-w-0 flex-1 pt-1">
                    {/* Agentic Engine Block (Historical) */}
                    {hasAgenticContent && (
                        <AgenticBlock msg={msg} />
                    )}

                    {/* Main content */}
                    <div className="bg-transparent text-slate-800 dark:text-slate-200">
                        <div className="markdown-container overflow-x-auto prose-slate dark:prose-invert">
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

    return (
        <div className="flex flex-col mb-4">
            {/* Reasoning Stream (Historical) */}
            {msg.reasoning_content && (
                <div className="mb-2">
                    <button
                        onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left"
                    >
                        <Brain size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">Thought process</span>
                        <ChevronDown size={12} className={`ml-1 text-slate-400 shrink-0 transition-transform ${isReasoningExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isReasoningExpanded && (
                        <div className="ml-3 mt-1 pl-4 border-l-2 border-slate-100 dark:border-slate-800/50">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar text-[11px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
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
