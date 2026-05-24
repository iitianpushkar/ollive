const CHATBOT_URL = process.env.NEXT_PUBLIC_CHATBOT_URL ?? "http://localhost:8000";
const INGESTION_URL = process.env.NEXT_PUBLIC_INGESTION_URL ?? "http://localhost:8001";

export interface Conversation {
  id: string;
  title: string | null;
  status: "active" | "cancelled" | "completed";
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface OpenRouterModelOption {
  id: string;
  name: string;
  vendor: string;
}

export interface ModelsConfig {
  provider: string;
  configured: boolean;
  models: OpenRouterModelOption[];
  defaultModel: string;
}

export async function fetchModels(): Promise<ModelsConfig> {
  const res = await fetch(`${CHATBOT_URL}/api/conversations/providers`);
  if (!res.ok) throw new Error("Failed to load models");
  const data = await res.json();
  return {
    provider: data.provider ?? "openrouter",
    configured: Boolean(data.configured),
    models: data.models ?? [],
    defaultModel: data.defaultModel ?? "openai/gpt-4o-mini",
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch(`${CHATBOT_URL}/api/conversations`);
  if (!res.ok) throw new Error("Failed to list conversations");
  return res.json();
}

export async function createConversation(body: {
  model?: string;
  title?: string;
}): Promise<Conversation> {
  const res = await fetch(`${CHATBOT_URL}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create conversation");
  }
  return res.json();
}

export async function getConversation(id: string): Promise<Conversation & { messages: Message[] }> {
  const res = await fetch(`${CHATBOT_URL}/api/conversations/${id}`);
  if (!res.ok) throw new Error("Conversation not found");
  return res.json();
}

export async function cancelConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${CHATBOT_URL}/api/conversations/${id}/cancel`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to cancel");
  return res.json();
}

export async function cancelStream(conversationId: string): Promise<void> {
  await fetch(`${CHATBOT_URL}/api/chat/${conversationId}/cancel-stream`, {
    method: "POST",
  });
}

export async function fetchMetrics() {
  const res = await fetch(`${INGESTION_URL}/api/v1/metrics/summary`);
  if (!res.ok) throw new Error("Failed to load metrics");
  return res.json();
}

export function streamChat(
  conversationId: string,
  message: string,
  options: { model?: string },
  handlers: {
    onChunk: (text: string) => void;
    onDone: (data: { messageId: string; content: string }) => void;
    onError: (msg: string) => void;
    onCancelled: () => void;
  }
): AbortController {
  const controller = new AbortController();

  void (async () => {
    try {
      const res = await fetch(`${CHATBOT_URL}/api/chat/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          stream: true,
          model: options.model,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        handlers.onError((err as { error?: string }).error ?? `HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7);
            if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (!data) continue;
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (event === "chunk") handlers.onChunk(String(parsed.text ?? ""));
          if (event === "done")
            handlers.onDone({
              messageId: String(parsed.messageId),
              content: String(parsed.content),
            });
          if (event === "error") handlers.onError(String(parsed.message ?? "Error"));
          if (event === "cancelled") handlers.onCancelled();
        }
      }
    } catch (err) {
      if (controller.signal.aborted) handlers.onCancelled();
      else handlers.onError(err instanceof Error ? err.message : "Stream failed");
    }
  })();

  return controller;
}
