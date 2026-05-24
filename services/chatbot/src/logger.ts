import { OlliveLogger } from "@ollive/sdk";

export const olliveLogger = new OlliveLogger({
  ingestionUrl: process.env.INGESTION_URL,
  apiKey: process.env.INGESTION_API_KEY,
});
