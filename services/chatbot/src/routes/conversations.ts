import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { config, PROVIDER_ID } from "../config.js";
import {
  cancelConversation,
  createConversation,
  getConversation,
  getMessages,
  listConversations,
} from "../db/conversations.js";
import { isConfigured } from "../providers/index.js";
import { listOpenRouterModels } from "../providers/models.js";

export const conversationsRouter = Router();

conversationsRouter.get("/providers", async (_req, res) => {
  const models = await listOpenRouterModels();
  res.json({
    provider: PROVIDER_ID,
    configured: isConfigured(),
    models,
    // Backward-compatible shape for older clients
    providers: [
      {
        id: PROVIDER_ID,
        models: models.map((m) => m.id),
        configured: isConfigured(),
      },
    ],
    defaultProvider: config.defaultProvider,
    defaultModel: config.defaultModel,
  });
});

conversationsRouter.get("/", async (_req, res) => {
  const items = await listConversations();
  res.json(items);
});

conversationsRouter.post("/", async (req, res) => {
  const schema = z.object({
    model: z.string().optional(),
    title: z.string().optional(),
  });
  const body = schema.parse(req.body);
  if (!isConfigured()) {
    res.status(400).json({ error: "OPENROUTER_API_KEY is not configured" });
    return;
  }
  const model = body.model ?? config.defaultModel;
  const conv = await createConversation(PROVIDER_ID, model, body.title);
  res.status(201).json(conv);
});

conversationsRouter.get("/:id", async (req, res) => {
  const conv = await getConversation(String(req.params.id));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const messages = await getMessages(conv.id);
  res.json({ ...conv, messages });
});

conversationsRouter.post("/:id/cancel", async (req, res) => {
  const conv = await cancelConversation(String(req.params.id));
  if (!conv) {
    res.status(404).json({ error: "Not found or already ended" });
    return;
  }
  res.json(conv);
});
