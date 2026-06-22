import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { toast } from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StreamingToolCall {
  index: number;
  name: string;
  id: string;
  args: string;
  done?: boolean;
}

export interface StreamingToolResult {
  tool_call_id: string;
  name: string;
  result: string;
}

interface UseStreamingChatOptions {
  /** Extra body fields to send with the stream request (e.g. context_dataset_ids) */
  extraBody?: Record<string, unknown>;
  /** Callback when a new session is created (receives session data) */
  onSessionCreated?: (session: any) => void;
}

interface UseStreamingChatReturn {
  // State
  streamingMessage: string;
  thinkingText: string;
  isStreaming: boolean;
  isThinking: boolean;
  isThinkingExpanded: boolean;
  toolCalls: StreamingToolCall[];
  toolResults: StreamingToolResult[];
  pendingUserMessage: string | null;

  // Actions
  setIsThinkingExpanded: (val: boolean) => void;
  sendMessage: (userContent: string, sessionId: string | null, botId: string, createSession: () => Promise<any>, generateTitle?: (sessionId: string, message: string) => void) => Promise<string | null>;
  stopStreaming: () => void;

  // Refs for scroll management
  chatEndRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStreamingChat(options: UseStreamingChatOptions = {}): UseStreamingChatReturn {
  const queryClient = useQueryClient();

  // ─── Published state (rendered) ────────────────────────────────────────────
  const [streamingMessage, setStreamingMessage] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [toolCalls, setToolCalls] = useState<StreamingToolCall[]>([]);
  const [toolResults, setToolResults] = useState<StreamingToolResult[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  // ─── Accumulation refs (batched, not rendered per-token) ───────────────────
  const contentRef = useRef('');
  const thinkingRef = useRef('');
  const toolCallsRef = useRef<StreamingToolCall[]>([]);
  const toolResultsRef = useRef<StreamingToolResult[]>([]);
  const isThinkingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  // ─── Scroll refs ───────────────────────────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null!);
  const scrollContainerRef = useRef<HTMLDivElement>(null!);
  const scrollRafRef = useRef<number | null>(null);
  const isUserScrolledUpRef = useRef(false);

  // Track if user has scrolled up (to stop auto-scroll)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 200;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      isUserScrolledUpRef.current = !isNearBottom;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── RAF-batched flush: coalesce accumulated ref values → state ────────────
  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current !== null) return; // Already scheduled

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      // Flush content
      const content = contentRef.current;
      const thinking = thinkingRef.current;
      const calls = toolCallsRef.current;
      const results = toolResultsRef.current;
      const thinking_active = isThinkingRef.current;

      setStreamingMessage(content);
      setThinkingText(thinking);
      setToolCalls([...calls]);
      setToolResults([...results]);
      setIsThinking(thinking_active);

      // Auto-scroll (only if user hasn't scrolled up)
      if (!isUserScrolledUpRef.current && chatEndRef.current) {
        if (scrollRafRef.current !== null) {
          cancelAnimationFrame(scrollRafRef.current);
        }
        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        });
      }
    });
  }, []);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    setIsStreaming(false);
    setStreamingMessage('');
    setThinkingText('');
    setIsThinking(false);
    setIsThinkingExpanded(false);
    setToolCalls([]);
    setToolResults([]);
    setPendingUserMessage(null);

    contentRef.current = '';
    thinkingRef.current = '';
    toolCallsRef.current = [];
    toolResultsRef.current = [];
    isThinkingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  // ─── Core send logic ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    userContent: string,
    sessionId: string | null,
    botId: string,
    createSession: () => Promise<any>,
    generateTitle?: (sessionId: string, message: string) => void
  ): Promise<string | null> => {
    if (!userContent.trim() || isStreaming) return sessionId;

    // 1. Show user message IMMEDIATELY (before any API call)
    setPendingUserMessage(userContent);
    isUserScrolledUpRef.current = false;

    // Scroll to bottom immediately
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    });

    // 2. Create session if needed
    let activeSessionId = sessionId;
    let isNewSession = false;

    if (!activeSessionId) {
      try {
        const newSession = await createSession();
        activeSessionId = newSession.id;
        isNewSession = true;
      } catch (error) {
        toast.error('Failed to start session');
        setPendingUserMessage(null);
        return null;
      }
    }

    activeSessionIdRef.current = activeSessionId;

    // 3. Generate title for new sessions
    if (isNewSession && activeSessionId && generateTitle) {
      generateTitle(activeSessionId, userContent);
    }

    // 4. Optimistic cache update (add user message to session)
    if (activeSessionId) {
      const updateSession = (old: any) => {
        if (!old) return { id: activeSessionId, messages: [{ id: 'temp-user-' + Date.now(), role: 'user', content: userContent, created_at: new Date().toISOString() }] };
        return {
          ...old,
          messages: [
            ...old.messages,
            { id: 'temp-user-' + Date.now(), role: 'user', content: userContent, created_at: new Date().toISOString() }
          ]
        };
      };
      
      queryClient.setQueryData(['ai-sessions', activeSessionId], updateSession);
      queryClient.setQueryData(['genie-sessions', activeSessionId], updateSession);
    }

    // 5. Clear pending message now that it's in the cache
    setPendingUserMessage(null);

    // 6. Reset streaming state
    contentRef.current = '';
    thinkingRef.current = '';
    toolCallsRef.current = [];
    toolResultsRef.current = [];
    isThinkingRef.current = false;

    setIsStreaming(true);
    setStreamingMessage('');
    setThinkingText('');
    setIsThinking(false);
    setIsThinkingExpanded(false);
    setToolCalls([]);
    setToolResults([]);

    // 7. Start SSE stream
    abortControllerRef.current = new AbortController();

    try {
      const token = useAuthStore.getState().token;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const body: Record<string, unknown> = { content: userContent, ...(options.extraBody || {}) };

      const response = await fetch(`${baseUrl}/api/ai/sessions/${activeSessionId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const text = await response.text();
        let errDetail = text;
        try { const data = JSON.parse(text); errDetail = data.detail || text; } catch (e) { /* ignore */ }
        throw new Error(`LLM Error ${response.status}: ${errDetail}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let needsFlush = false;

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned.startsWith('data:')) continue;

          const jsonStr = cleaned.startsWith('data: ') ? cleaned.substring(6) : cleaned.substring(5);

          if (jsonStr.trim() === '[DONE]') {
            // Mark all tool calls as done
            toolCallsRef.current = toolCallsRef.current.map(tc => ({ ...tc, done: true }));
            isThinkingRef.current = false;
            needsFlush = true;
            queryClient.invalidateQueries({ queryKey: ['ai-sessions', activeSessionId] });
            continue;
          }

          try {
            const data = JSON.parse(jsonStr.trim());

            if (data.event === 'user_message_created') continue;

            // Handle tool_result SSE events
            if (data.event === 'tool_result') {
              toolResultsRef.current = [...toolResultsRef.current, { tool_call_id: data.tool_call_id, name: data.name, result: data.result }];
              toolCallsRef.current = toolCallsRef.current.map(tc => tc.id === data.tool_call_id ? { ...tc, done: true } : tc);
              needsFlush = true;
              continue;
            }

            // Handle done event with final message
            if (data.event === 'done') {
              // Final message from server — will be fetched by invalidation
              continue;
            }

            const choice = data.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            if (!delta) continue;

            // Reasoning / Thinking
            const reasoning = delta.reasoning || delta.reasoning_content || delta.thinking || '';
            if (reasoning) {
              isThinkingRef.current = true;
              thinkingRef.current += reasoning;
              needsFlush = true;
            }

            // Content
            const content = delta.content || '';
            if (content) {
              isThinkingRef.current = false;
              contentRef.current += content;
              needsFlush = true;
            }

            // Tool calls
            const tcs = delta.tool_calls;
            if (tcs && Array.isArray(tcs)) {
              isThinkingRef.current = false;
              for (const tc of tcs) {
                const idx = tc.index;
                const existingIndex = toolCallsRef.current.findIndex(item => item.index === idx);
                if (existingIndex === -1) {
                  toolCallsRef.current = [...toolCallsRef.current, {
                    index: idx,
                    id: tc.id || '',
                    name: tc.function?.name || '',
                    args: tc.function?.arguments || '',
                    done: false
                  }];
                } else {
                  const item = toolCallsRef.current[existingIndex];
                  const updated = [...toolCallsRef.current];
                  updated[existingIndex] = {
                    ...item,
                    id: tc.id || item.id,
                    name: tc.function?.name || item.name,
                    args: item.args + (tc.function?.arguments || '')
                  };
                  toolCallsRef.current = updated;
                }
              }
              needsFlush = true;
            }
          } catch (e) {
            // Incomplete JSON chunk, skip
          }
        }

        if (needsFlush) {
          scheduleFlush();
        }
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error(error);
        toast.error('Error receiving streaming response');
      }
    } finally {
      // Capture final values from refs for cache update
      const finalContent = contentRef.current;
      const finalThinking = thinkingRef.current;
      const finalToolCalls = [...toolCallsRef.current];
      const finalToolResults = [...toolResultsRef.current];

      // Add AI message to cache
      if (activeSessionId) {
        const updateSession = (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [
              ...old.messages,
              {
                id: 'temp-ai-' + Date.now(),
                role: 'ai',
                content: finalContent,
                reasoning_content: finalThinking || null,
                tool_calls: finalToolCalls.map(t => ({ id: t.id, type: 'function', name: t.name, arguments: t.args })),
                tool_results: finalToolResults,
                created_at: new Date().toISOString()
              }
            ]
          };
        };
        queryClient.setQueryData(['ai-sessions', activeSessionId], updateSession);
        queryClient.setQueryData(['genie-sessions', activeSessionId], updateSession);
      }

      // Reset all state
      contentRef.current = '';
      thinkingRef.current = '';
      toolCallsRef.current = [];
      toolResultsRef.current = [];
      isThinkingRef.current = false;

      setStreamingMessage('');
      setThinkingText('');
      setIsStreaming(false);
      setIsThinking(false);
      setIsThinkingExpanded(false);
      setToolCalls([]);
      setToolResults([]);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Invalidate to fetch the server-saved version
      if (activeSessionId) {
        queryClient.invalidateQueries({ queryKey: ['ai-sessions', activeSessionId] });
        queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['genie-sessions', activeSessionId] });
        queryClient.invalidateQueries({ queryKey: ['genie-sessions'] });
      }
    }

    return activeSessionId;
  }, [isStreaming, queryClient, scheduleFlush, options.extraBody]);

  return {
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
  };
}
