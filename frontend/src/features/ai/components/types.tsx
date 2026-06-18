import React from 'react';
import { Terminal, Brain, Zap, TrendingUp, Cpu, Sparkles } from 'lucide-react';

export interface AIBot {
    id: string;
    name: string;
    description: string;
    bot_id: string;
    avatar_config: {
        icon: string;
        color: string;
        tagline: string;
    };
    llm_config: {
        base_url?: string;
        model_name?: string;
        api_key?: string;
        api_type?: 'chat_completions' | 'messages';
        headers?: Record<string, string>;
        system_prompt?: string;
        stream?: boolean;
    };
    knowledge_config: {
        dataset_ids?: number[];
    };
    tools_config?: {
        enable_sql_tool?: boolean;
        mcp_servers?: { name: string; url: string; api_key?: string }[];
    };
    is_system: boolean;
    is_active: boolean;
}

export interface Message {
    id: number;
    role: 'user' | 'ai';
    content: string;
    reasoning_content?: string | null;
    tool_calls?: { id: string; name: string; arguments: string }[] | null;
    tool_results?: { tool_call_id: string; name: string; result: string }[] | null;
    created_at: string;
}

export interface ChatSession {
    id: string;
    title: string;
    bot_id: string;
    messages: Message[];
    created_at: string;
}

export const ICON_MAP: Record<string, React.ReactNode> = {
    'Terminal': <Terminal size={24} />,
    'Brain': <Brain size={24} />,
    'Zap': <Zap size={24} />,
    'TrendingUp': <TrendingUp size={24} />,
    'Cpu': <Cpu size={24} />,
    'Sparkles': <Sparkles size={24} />
};
