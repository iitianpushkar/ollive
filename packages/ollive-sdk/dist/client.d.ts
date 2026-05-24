import { preview, redactPii } from "./redaction.js";
import type { InferenceLogPayload, InferenceStatus, TraceContext } from "./types.js";
import { InferenceLogPayloadSchema } from "./types.js";
export interface OlliveLoggerOptions {
    ingestionUrl?: string;
    apiKey?: string;
    previewChars?: number;
    piiRedaction?: boolean;
    timeoutMs?: number;
}
export declare class OlliveLogger {
    private ingestionUrl;
    private apiKey;
    private previewChars;
    private piiRedaction;
    private timeoutMs;
    constructor(options?: OlliveLoggerOptions);
    /** Fire-and-forget log delivery — never throws to caller */
    log(payload: InferenceLogPayload): void;
    logSync(payload: InferenceLogPayload): Promise<boolean>;
    private send;
    trace<T>(params: {
        sessionId: string;
        provider: string;
        model: string;
        conversationId?: string;
        messageId?: string;
        requestInput?: string;
        isStreaming?: boolean;
        metadata?: Record<string, unknown>;
    }, fn: (ctx: TraceContext) => Promise<T>): Promise<T>;
}
export { preview, redactPii };
export type { InferenceLogPayload, InferenceStatus, TraceContext };
export { InferenceLogPayloadSchema, InferenceStatus as InferenceStatusEnum };
//# sourceMappingURL=client.d.ts.map