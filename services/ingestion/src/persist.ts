import { getPool } from "@ollive/db";
import type { InferenceLogPayload } from "@ollive/sdk";

export async function persistInferenceLog(payload: InferenceLogPayload): Promise<string> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO inference_logs (
      conversation_id, session_id, message_id, provider, model,
      latency_ms, prompt_tokens, completion_tokens, total_tokens,
      status, error_message, request_preview, response_preview,
      is_streaming, started_at, completed_at, metadata
    ) VALUES (
      $1::uuid, $2, $3::uuid, $4, $5,
      $6, $7, $8, $9,
      $10::inference_status, $11, $12, $13,
      $14, $15::timestamptz, $16::timestamptz, $17::jsonb
    ) RETURNING id`,
    [
      payload.conversationId ?? null,
      payload.sessionId,
      payload.messageId ?? null,
      payload.provider,
      payload.model,
      payload.latencyMs ?? null,
      payload.promptTokens ?? null,
      payload.completionTokens ?? null,
      payload.totalTokens ?? null,
      payload.status,
      payload.errorMessage ?? null,
      payload.requestPreview ?? null,
      payload.responsePreview ?? null,
      payload.isStreaming ?? false,
      payload.startedAt,
      payload.completedAt ?? null,
      JSON.stringify(payload.metadata ?? {}),
    ]
  );

  await upsertMetrics(payload);
  return result.rows[0].id;
}

async function upsertMetrics(payload: InferenceLogPayload): Promise<void> {
  const pool = getPool();
  const bucket = new Date(payload.startedAt);
  bucket.setMinutes(0, 0, 0);

  await pool.query(
    `INSERT INTO metrics_hourly (bucket_hour, provider, model, request_count, error_count, total_latency_ms, total_tokens)
     VALUES ($1, $2, $3, 1, $4, $5, $6)
     ON CONFLICT (bucket_hour, provider, model)
     DO UPDATE SET
       request_count = metrics_hourly.request_count + 1,
       error_count = metrics_hourly.error_count + EXCLUDED.error_count,
       total_latency_ms = metrics_hourly.total_latency_ms + EXCLUDED.total_latency_ms,
       total_tokens = metrics_hourly.total_tokens + EXCLUDED.total_tokens`,
    [
      bucket.toISOString(),
      payload.provider,
      payload.model,
      payload.status === "error" ? 1 : 0,
      payload.latencyMs ?? 0,
      payload.totalTokens ?? 0,
    ]
  );
}
