import pg from "pg";
export declare function getPool(): pg.Pool;
export declare function closePool(): Promise<void>;
export type ConversationStatus = "active" | "cancelled" | "completed";
export type MessageRole = "user" | "assistant" | "system";
export type InferenceStatus = "success" | "error" | "cancelled";
export interface Conversation {
    id: string;
    title: string | null;
    status: ConversationStatus;
    provider: string | null;
    model: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface Message {
    id: string;
    conversation_id: string;
    role: MessageRole;
    content: string;
    created_at: Date;
}
export interface InferenceLogRow {
    id: string;
    conversation_id: string | null;
    session_id: string;
    message_id: string | null;
    provider: string;
    model: string;
    latency_ms: number | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
    status: InferenceStatus;
    error_message: string | null;
    request_preview: string | null;
    response_preview: string | null;
    is_streaming: boolean;
    started_at: Date;
    completed_at: Date | null;
    metadata: Record<string, unknown>;
    created_at: Date;
}
//# sourceMappingURL=index.d.ts.map