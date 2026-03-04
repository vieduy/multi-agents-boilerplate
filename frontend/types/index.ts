export type AgentId = string;

export interface AgentInfo {
    id: AgentId;
    name: string;
    description: string;
    capabilities: string[];
    healthy?: boolean;
}

export type MessageRole = "user" | "assistant";

export interface ToolCall {
    id: string;
    name: string;
    arguments: string;     // JSON string
    result?: string;        // JSON string
    status: "running" | "success" | "error";
}

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    agentId?: AgentId;
    agentName?: string;
    route?: string;
    streaming?: boolean;
    timestamp: Date;
    toolCalls?: ToolCall[];
}

export interface Session {
    session_id: string;
    created_at: string;
}

export interface RouteRequest {
    query: string;
    session_id?: string;
    stream?: boolean;
}

// SSE chunk types from the backend
export interface SSEChunk {
    type?: string;
    content?: string;
    delta?: string;
    text?: string;
    // agent info sometimes returned in stream
    agent?: string;
    route?: string;
}
