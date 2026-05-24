export const config = {
  port: Number(process.env.PORT ?? 8001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  apiKey: process.env.INGESTION_API_KEY ?? "dev-ingestion-key",
  logStreamKey: "ollive:logs",
  consumerGroup: "ollive-workers",
  consumerName: process.env.HOSTNAME ?? `worker-${process.pid}`,
};
