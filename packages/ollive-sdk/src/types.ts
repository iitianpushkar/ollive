import { z } from "zod";

export const InferenceStatus = z.enum(["success", "error", "cancelled"]);
export type InferenceStatus = z.infer<typeof InferenceStatus>;

export const InferenceLogPayloadSchema = z.object({
  sessionId: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  status: InferenceStatus,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  latencyMs: z.number().optional(),
  promptTokens: z.number().int().optional(),
  completionTokens: z.number().int().optional(),
  totalTokens: z.number().int().optional(),
  errorMessage: z.string().optional(),
  requestPreview: z.string().optional(),
  responsePreview: z.string().optional(),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  isStreaming: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export type InferenceLogPayload = z.infer<typeof InferenceLogPayloadSchema>;

export interface TraceContext {
  response?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  error?: string;
  status: InferenceStatus;
}
