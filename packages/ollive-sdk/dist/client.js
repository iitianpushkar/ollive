import { preview, redactPii } from "./redaction.js";
import { InferenceLogPayloadSchema } from "./types.js";
export class OlliveLogger {
    ingestionUrl;
    apiKey;
    previewChars;
    piiRedaction;
    timeoutMs;
    constructor(options = {}) {
        this.ingestionUrl = (options.ingestionUrl ??
            process.env.INGESTION_URL ??
            "http://localhost:8001").replace(/\/$/, "");
        this.apiKey = options.apiKey ?? process.env.INGESTION_API_KEY ?? "";
        this.previewChars = options.previewChars ?? Number(process.env.OLLIVE_LOG_PREVIEW_CHARS ?? 500);
        this.piiRedaction =
            options.piiRedaction ??
                (process.env.OLLIVE_PII_REDACTION ?? "true").toLowerCase() === "true";
        this.timeoutMs = options.timeoutMs ?? 5000;
    }
    /** Fire-and-forget log delivery — never throws to caller */
    log(payload) {
        void this.send(payload);
    }
    async logSync(payload) {
        return this.send(payload);
    }
    async send(payload) {
        try {
            const parsed = InferenceLogPayloadSchema.parse(payload);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            const headers = {
                "Content-Type": "application/json",
            };
            if (this.apiKey)
                headers["X-API-Key"] = this.apiKey;
            const res = await fetch(`${this.ingestionUrl}/api/v1/logs`, {
                method: "POST",
                headers,
                body: JSON.stringify(parsed),
                signal: controller.signal,
            });
            clearTimeout(timer);
            return res.status === 200 || res.status === 202;
        }
        catch {
            return false;
        }
    }
    async trace(params, fn) {
        const startedAt = new Date();
        const t0 = performance.now();
        const ctx = { status: "success" };
        try {
            return await fn(ctx);
        }
        catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                ctx.status = "cancelled";
                ctx.error = "Request cancelled";
            }
            else {
                ctx.status = "error";
                ctx.error = err instanceof Error ? err.message : String(err);
            }
            throw err;
        }
        finally {
            const latencyMs = performance.now() - t0;
            const completedAt = new Date();
            this.log({
                sessionId: params.sessionId,
                provider: params.provider,
                model: params.model,
                status: ctx.status,
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                latencyMs,
                promptTokens: ctx.promptTokens,
                completionTokens: ctx.completionTokens,
                totalTokens: ctx.totalTokens,
                errorMessage: ctx.error,
                requestPreview: preview(params.requestInput, this.previewChars, this.piiRedaction),
                responsePreview: preview(ctx.response, this.previewChars, this.piiRedaction),
                conversationId: params.conversationId,
                messageId: params.messageId,
                isStreaming: params.isStreaming ?? false,
                metadata: params.metadata ?? {},
            });
        }
    }
}
export { preview, redactPii };
export { InferenceLogPayloadSchema };
//# sourceMappingURL=client.js.map