import { InferenceLogPayloadSchema } from "@ollive/sdk";
import { Router, type Request, type Response } from "express";
import { publishLogEvent } from "../redis.js";

export const logsRouter = Router();

logsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = InferenceLogPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  try {
    const eventId = await publishLogEvent(JSON.stringify(parsed.data));
    res.status(202).json({ accepted: true, eventId });
  } catch (err) {
    console.error("Failed to enqueue log", err);
    res.status(503).json({ error: "Ingestion queue unavailable" });
  }
});
