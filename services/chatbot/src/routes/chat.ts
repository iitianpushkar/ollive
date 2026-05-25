import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { config, PROVIDER_ID, vendorFromModel } from "../config.js";
import {
  addMessage,
  appendMessageContent,
  getConversation,
  getLastAssistantMessage,
  getRecentMessages,
} from "../db/conversations.js";
import { olliveLogger } from "../logger.js";
import { getProvider } from "../providers/index.js";
import type { ChatMessage } from "../providers/types.js";

export const chatRouter = Router();

const activeStreams = new Map<string, AbortController>();

const chatBodySchema = z.object({
  message: z.string().min(1),
  stream: z.boolean().default(true),
  model: z.string().optional(),
});

const resumeBodySchema = z.object({
  stream: z.boolean().default(true),
  model: z.string().optional(),
});

chatRouter.post("/:conversationId", async (req: Request, res: Response) => {
  const conversationId = String(req.params.conversationId);
  const body = chatBodySchema.parse(req.body);

  const conv = await getConversation(conversationId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (conv.status === "cancelled") {
    res.status(409).json({ error: "Conversation was cancelled" });
    return;
  }

  const model = body.model ?? conv.model ?? config.defaultModel;
  const vendor = vendorFromModel(model);
  const provider = getProvider();
  const sessionId = uuidv4();

  const userMsg = await addMessage(conversationId, "user", body.message);
  const history = await getRecentMessages(conversationId, config.contextWindow);
  const messages: ChatMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const requestPreview = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const abortController = new AbortController();
  activeStreams.set(conversationId, abortController);

  const cleanup = () => activeStreams.delete(conversationId);

  const logMeta = {
    openRouterModel: model,
    vendor,
  };

  if (body.stream && provider.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof (res as { flushHeaders?: () => void }).flushHeaders === "function") {
      (res as { flushHeaders: () => void }).flushHeaders();
    }

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    let partialContent = "";

    try {
      await olliveLogger.trace(
        {
          sessionId,
          provider: PROVIDER_ID,
          model,
          conversationId,
          messageId: userMsg.id,
          requestInput: requestPreview,
          isStreaming: true,
          metadata: logMeta,
        },
        async (ctx) => {
          const result = await provider.stream!(
            messages,
            model,
            abortController.signal,
            (chunk) => {
              partialContent += chunk;
              send("chunk", { text: chunk });
            }
          );
          ctx.response = result.content;
          ctx.promptTokens = result.promptTokens;
          ctx.completionTokens = result.completionTokens;
          ctx.totalTokens = result.totalTokens;

          const assistantMsg = await addMessage(conversationId, "assistant", result.content);
          send("done", { messageId: assistantMsg.id, content: result.content });
        }
      );
    } catch (err) {
      if (abortController.signal.aborted) {
        if (partialContent.trim().length > 0) {
          const assistantMsg = await addMessage(conversationId, "assistant", partialContent);
          send("cancelled", {
            reason: "cancelled",
            partial: partialContent,
            messageId: assistantMsg.id,
          });
        } else {
          send("cancelled", { reason: "cancelled" });
        }
      } else {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      }
    } finally {
      cleanup();
      res.end();
    }
    return;
  }

  try {
    const result = await olliveLogger.trace(
      {
        sessionId,
        provider: PROVIDER_ID,
        model,
        conversationId,
        messageId: userMsg.id,
        requestInput: requestPreview,
        isStreaming: false,
        metadata: logMeta,
      },
      async (ctx) => {
        const completion = await provider.complete(messages, model, abortController.signal);
        ctx.response = completion.content;
        ctx.promptTokens = completion.promptTokens;
        ctx.completionTokens = completion.completionTokens;
        ctx.totalTokens = completion.totalTokens;
        return completion;
      }
    ) as Awaited<ReturnType<typeof provider.complete>>;
    const assistantMsg = await addMessage(conversationId, "assistant", result.content);
    res.json({
      message: assistantMsg,
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
      },
    });
  } catch (err) {
    if (abortController.signal.aborted) {
      res.status(499).json({ error: "Cancelled" });
    } else {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Inference failed",
      });
    }
  } finally {
    cleanup();
  }
});

chatRouter.post("/:conversationId/resume", async (req: Request, res: Response) => {
  const conversationId = String(req.params.conversationId);
  const body = resumeBodySchema.parse(req.body);

  const conv = await getConversation(conversationId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const lastAssistant = await getLastAssistantMessage(conversationId);
  if (!lastAssistant) {
    res.status(409).json({ error: "No assistant response to resume" });
    return;
  }

  const model = body.model ?? conv.model ?? config.defaultModel;
  const vendor = vendorFromModel(model);
  const provider = getProvider();
  const sessionId = uuidv4();
  const history = await getRecentMessages(conversationId, config.contextWindow);
  const messages: ChatMessage[] = [
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user",
      content:
        "Continue the previous assistant response from exactly where it stopped. Do not repeat any earlier text, headings, or bullets.",
    },
  ];
  const requestPreview = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const abortController = new AbortController();
  activeStreams.set(conversationId, abortController);
  const cleanup = () => activeStreams.delete(conversationId);
  const logMeta = { openRouterModel: model, vendor, resume: true };

  if (body.stream && provider.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof (res as { flushHeaders?: () => void }).flushHeaders === "function") {
      (res as { flushHeaders: () => void }).flushHeaders();
    }

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    let resumedContent = "";

    try {
      await olliveLogger.trace(
        {
          sessionId,
          provider: PROVIDER_ID,
          model,
          conversationId,
          messageId: lastAssistant.id,
          requestInput: requestPreview,
          isStreaming: true,
          metadata: logMeta,
        },
        async (ctx) => {
          const result = await provider.stream!(
            messages,
            model,
            abortController.signal,
            (chunk) => {
              resumedContent += chunk;
              send("chunk", { text: chunk });
            }
          );
          ctx.response = result.content;
          ctx.promptTokens = result.promptTokens;
          ctx.completionTokens = result.completionTokens;
          ctx.totalTokens = result.totalTokens;

          const updatedMsg = await appendMessageContent(lastAssistant.id, result.content);
          send("done", { messageId: updatedMsg.id, content: updatedMsg.content, appended: true });
        }
      );
    } catch (err) {
      if (abortController.signal.aborted) {
        if (resumedContent.trim().length > 0) {
          const updatedMsg = await appendMessageContent(lastAssistant.id, resumedContent);
          send("cancelled", {
            reason: "cancelled",
            partial: resumedContent,
            messageId: updatedMsg.id,
            appended: true,
          });
        } else {
          send("cancelled", { reason: "cancelled" });
        }
      } else {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      }
    } finally {
      cleanup();
      res.end();
    }
    return;
  }

  res.status(400).json({ error: "Resume currently requires streaming provider support" });
});

chatRouter.post("/:conversationId/cancel-stream", (req, res) => {
  const id = String(req.params.conversationId);
  const controller = activeStreams.get(id);
  if (controller) {
    controller.abort();
    activeStreams.delete(id);
    res.json({ cancelled: true });
  } else {
    res.json({ cancelled: false, message: "No active stream" });
  }
});
