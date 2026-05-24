import { closePool } from "@ollive/db";
import { InferenceLogPayloadSchema } from "@ollive/sdk";
import { config } from "./config.js";
import { persistInferenceLog } from "./persist.js";
import { ensureConsumerGroup, getRedis } from "./redis.js";

type StreamEntry = [string, string[]];
type StreamMessage = [string, StreamEntry[]];

async function processBatch(): Promise<void> {
  const redis = getRedis();
  const messages = (await redis.xreadgroup(
    "GROUP",
    config.consumerGroup,
    config.consumerName,
    "COUNT",
    10,
    "BLOCK",
    5000,
    "STREAMS",
    config.logStreamKey,
    ">"
  )) as StreamMessage[] | null;

  if (!messages) return;

  for (const [, entries] of messages) {
    for (const [id, fields] of entries) {
      const payloadIdx = fields.indexOf("payload");
      const raw = payloadIdx >= 0 ? fields[payloadIdx + 1] : null;
      try {
        const parsed = InferenceLogPayloadSchema.parse(JSON.parse(raw ?? "{}"));
        await persistInferenceLog(parsed);
        await redis.xack(config.logStreamKey, config.consumerGroup, id);
      } catch (err) {
        console.error(`Failed to process event ${id}`, err);
        // Ack poison messages after logging to avoid infinite retry in demo
        await redis.xack(config.logStreamKey, config.consumerGroup, id);
      }
    }
  }
}

async function main(): Promise<void> {
  await ensureConsumerGroup();
  console.log(`Worker ${config.consumerName} started`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processBatch();
    } catch (err) {
      console.error("Worker loop error", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

main().catch(async (err) => {
  console.error(err);
  await closePool();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await closePool();
  process.exit(0);
});
