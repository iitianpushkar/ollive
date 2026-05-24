import OpenAI from "openai";
import { config } from "../config.js";
import type { ChatMessage, CompletionResult, LLMProvider } from "./types.js";

export function createOpenRouterProvider(): LLMProvider {
  if (!config.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const client = new OpenAI({
    apiKey: config.openRouterApiKey,
    baseURL: config.openRouterBaseUrl,
    defaultHeaders: {
      "HTTP-Referer": config.openRouterSiteUrl,
      "X-Title": config.openRouterAppName,
    },
  });

  return {
    name: "openrouter",
    async complete(messages, model, signal) {
      const res = await client.chat.completions.create(
        { model, messages, stream: false },
        { signal }
      );
      return {
        content: res.choices[0]?.message?.content ?? "",
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      };
    },
    async stream(messages, model, signal, onChunk) {
      const stream = await client.chat.completions.create(
        { model, messages, stream: true, stream_options: { include_usage: true } },
        { signal }
      );
      let full = "";
      let usage = { prompt: 0, completion: 0, total: 0 };
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onChunk(delta);
        }
        if (chunk.usage) {
          usage = {
            prompt: chunk.usage.prompt_tokens ?? 0,
            completion: chunk.usage.completion_tokens ?? 0,
            total: chunk.usage.total_tokens ?? 0,
          };
        }
      }
      return {
        content: full,
        promptTokens: usage.prompt || undefined,
        completionTokens: usage.completion || undefined,
        totalTokens: usage.total || undefined,
      };
    },
  };
}

export type { ChatMessage, CompletionResult };
