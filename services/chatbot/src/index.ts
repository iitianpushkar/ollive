import { closePool } from "@ollive/db";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { chatRouter } from "./routes/chat.js";
import { conversationsRouter } from "./routes/conversations.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "chatbot" });
});

app.use("/api/conversations", conversationsRouter);
app.use("/api/chat", chatRouter);

const server = app.listen(config.port, () => {
  console.log(`Chatbot API listening on :${config.port}`);
});

async function shutdown() {
  server.close();
  await closePool();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
