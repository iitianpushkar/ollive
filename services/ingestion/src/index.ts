import { closePool } from "@ollive/db";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { logsRouter } from "./routes/logs.js";
import { metricsRouter } from "./routes/metrics.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ingestion" });
});

app.use("/api/v1/logs", apiKeyAuth, logsRouter);
app.use("/api/v1/metrics", metricsRouter);

const server = app.listen(config.port, () => {
  console.log(`Ingestion API listening on :${config.port}`);
});

async function shutdown() {
  server.close();
  await closePool();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
