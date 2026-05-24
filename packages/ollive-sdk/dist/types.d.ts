import { z } from "zod";
export declare const InferenceStatus: z.ZodEnum<["success", "error", "cancelled"]>;
export type InferenceStatus = z.infer<typeof InferenceStatus>;
export declare const InferenceLogPayloadSchema: z.ZodObject<{
    sessionId: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
    status: z.ZodEnum<["success", "error", "cancelled"]>;
    startedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    promptTokens: z.ZodOptional<z.ZodNumber>;
    completionTokens: z.ZodOptional<z.ZodNumber>;
    totalTokens: z.ZodOptional<z.ZodNumber>;
    errorMessage: z.ZodOptional<z.ZodString>;
    requestPreview: z.ZodOptional<z.ZodString>;
    responsePreview: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    messageId: z.ZodOptional<z.ZodString>;
    isStreaming: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "error" | "cancelled";
    sessionId: string;
    provider: string;
    model: string;
    startedAt: string;
    isStreaming: boolean;
    metadata: Record<string, unknown>;
    completedAt?: string | undefined;
    latencyMs?: number | undefined;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    errorMessage?: string | undefined;
    requestPreview?: string | undefined;
    responsePreview?: string | undefined;
    conversationId?: string | undefined;
    messageId?: string | undefined;
}, {
    status: "success" | "error" | "cancelled";
    sessionId: string;
    provider: string;
    model: string;
    startedAt: string;
    completedAt?: string | undefined;
    latencyMs?: number | undefined;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    errorMessage?: string | undefined;
    requestPreview?: string | undefined;
    responsePreview?: string | undefined;
    conversationId?: string | undefined;
    messageId?: string | undefined;
    isStreaming?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type InferenceLogPayload = z.infer<typeof InferenceLogPayloadSchema>;
export interface TraceContext {
    response?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    error?: string;
    status: InferenceStatus;
}
//# sourceMappingURL=types.d.ts.map