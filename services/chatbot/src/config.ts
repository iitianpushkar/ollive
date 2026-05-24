export const PROVIDER_ID = "openrouter" as const;

export const config = {
  port: Number(process.env.PORT ?? 8000),
  defaultProvider: PROVIDER_ID,
  defaultModel: process.env.DEFAULT_MODEL ?? "openai/gpt-4o-mini",
  contextWindow: Number(process.env.CONTEXT_WINDOW ?? 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
  openRouterAppName: process.env.OPENROUTER_APP_NAME ?? "Ollive",
};

/** Curated defaults when OpenRouter models API is unavailable */
export const FALLBACK_MODELS: Array<{ id: string; name: string; vendor: string }> = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", vendor: "openai" },
  { id: "openai/gpt-4o", name: "GPT-4o", vendor: "openai" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", vendor: "openai" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", vendor: "anthropic" },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", vendor: "anthropic" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", vendor: "google" },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro", vendor: "google" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", vendor: "deepseek" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", vendor: "meta" },
  { id: "x-ai/grok-2-1212", name: "Grok 2", vendor: "x-ai" },
];

export function vendorFromModel(modelId: string): string {
  const slash = modelId.indexOf("/");
  return slash > 0 ? modelId.slice(0, slash) : "unknown";
}
