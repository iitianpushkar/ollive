import { Redis } from "ioredis";
import { config } from "./config.js";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
  }
  return redis;
}

export async function publishLogEvent(payload: string): Promise<string> {
  const client = getRedis();
  const id = await client.xadd(config.logStreamKey, "*", "payload", payload);
  return id ?? "";
}

export async function ensureConsumerGroup(): Promise<void> {
  const client = getRedis();
  try {
    await client.xgroup(
      "CREATE",
      config.logStreamKey,
      config.consumerGroup,
      "0",
      "MKSTREAM"
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("BUSYGROUP")) throw err;
  }
}
