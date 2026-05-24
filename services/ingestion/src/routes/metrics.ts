import { getPool } from "@ollive/db";
import { Router, type Request, type Response } from "express";

export const metricsRouter = Router();

metricsRouter.get("/summary", async (_req: Request, res: Response) => {
  const pool = getPool();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [latency, throughput, errors, byProvider] = await Promise.all([
    pool.query(
      `SELECT
         provider, model,
         COUNT(*)::int AS requests,
         AVG(latency_ms)::float AS avg_latency_ms,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)::float AS p50_latency_ms,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::float AS p95_latency_ms
       FROM inference_logs
       WHERE started_at >= $1 AND latency_ms IS NOT NULL
       GROUP BY provider, model
       ORDER BY requests DESC`,
      [since]
    ),
    pool.query(
      `SELECT
         date_trunc('hour', started_at) AS hour,
         COUNT(*)::int AS requests,
         SUM(COALESCE(total_tokens, 0))::int AS tokens
       FROM inference_logs
       WHERE started_at >= $1
       GROUP BY 1
       ORDER BY 1`,
      [since]
    ),
    pool.query(
      `SELECT
         status,
         COUNT(*)::int AS count,
         provider
       FROM inference_logs
       WHERE started_at >= $1
       GROUP BY status, provider
       ORDER BY count DESC`,
      [since]
    ),
    pool.query(
      `SELECT provider, model,
              COUNT(*) FILTER (WHERE status = 'error')::int AS errors,
              COUNT(*)::int AS total
       FROM inference_logs
       WHERE started_at >= $1
       GROUP BY provider, model`,
      [since]
    ),
  ]);

  res.json({
    windowHours: 24,
    latency: latency.rows,
    throughput: throughput.rows,
    errors: errors.rows,
    byProvider: byProvider.rows,
  });
});

metricsRouter.get("/hourly", async (_req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT bucket_hour, provider, model, request_count, error_count,
            total_latency_ms, total_tokens
     FROM metrics_hourly
     WHERE bucket_hour >= NOW() - INTERVAL '7 days'
     ORDER BY bucket_hour DESC
     LIMIT 500`
  );
  res.json(result.rows);
});
